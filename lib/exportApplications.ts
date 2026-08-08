import JSZip from "jszip";
import type { TeamApplication } from "@/types";

export interface ExportOptions {
  applications: TeamApplication[];
  campaignTitle: string;
  roleById: Map<string, { title: string; teamId: string }>;
  teamName: (teamId: string) => string;
  questionMap: Map<string, string> | null;
}

export function sanitizeZipEntryName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, "-")
    .split("")
    .filter((c) => c.charCodeAt(0) >= 32)
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "applicant";
}

function firstChoiceLabel(app: TeamApplication, opts: ExportOptions): string {
  if (app.roleRanking && app.roleRanking.length > 0) {
    return opts.roleById.get(app.roleRanking[0].roleId)?.title || app.roleRanking[0].roleId;
  }
  if (app.teamRanking && app.teamRanking.length > 0) {
    return opts.teamName(app.teamRanking[0]);
  }
  return "No role selected";
}

function formatDate(value: TeamApplication["createdAt"]): string {
  if (!value) return "Unknown";
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toDateString();
  }
  return value.toDate().toDateString();
}

function resumeFileName(path?: string): string {
  if (!path) return "resume.pdf";
  const base = path.split("/").pop() || "";
  const stripped = base.replace(/^\d+_/, "");
  const clean = stripped.replace(/[\\/:*?"<>|]/g, "-");
  return clean || "resume.pdf";
}

export function buildApplicantText(app: TeamApplication, opts: ExportOptions): string {
  const lines: string[] = [];
  lines.push(`Application for: ${opts.campaignTitle}`);
  lines.push(`Name: ${app.name}`);
  lines.push(`Email: ${app.email}`);
  lines.push(`Submitted: ${formatDate(app.createdAt)}`);
  if (app.program) lines.push(`Program: ${app.program}`);
  if (app.university) lines.push(`University: ${app.university}`);
  if (app.graduationYear) lines.push(`Graduation year: ${app.graduationYear}`);
  if (app.linkedin) lines.push(`LinkedIn: ${app.linkedin}`);
  if (typeof app.weeklyHours === "number") lines.push(`Weekly hours: ${app.weeklyHours}`);
  if (app.interests && app.interests.length > 0) lines.push(`Interests: ${app.interests.join(", ")}`);
  if (app.customRole) lines.push(`Proposed role: ${app.customRole}`);

  if (app.roleRanking && app.roleRanking.length > 0) {
    lines.push("");
    lines.push("Role preferences:");
    app.roleRanking.forEach((c, idx) => {
      const title = opts.roleById.get(c.roleId)?.title || c.roleId;
      const team = opts.teamName(c.teamId);
      lines.push(`${idx + 1}. ${title} (${team})`);
      if (c.justification) lines.push(`   Justification: ${c.justification}`);
    });
  } else if (app.teamRanking && app.teamRanking.length > 0) {
    lines.push("");
    lines.push("Team preferences:");
    app.teamRanking.forEach((tid, idx) => lines.push(`${idx + 1}. ${opts.teamName(tid)}`));
  }

  if (app.motivation) {
    lines.push("");
    lines.push("Motivation:");
    lines.push(app.motivation);
  }

  if (app.customAnswers && Object.keys(app.customAnswers).length > 0) {
    lines.push("");
    lines.push("Custom answers:");
    Object.entries(app.customAnswers).forEach(([key, value]) => {
      const label = opts.questionMap?.get(key) || key;
      const answer = Array.isArray(value) ? value.join(", ") : value;
      lines.push(`${label}: ${answer || "No answer"}`);
    });
  }

  if (!app.resume?.url) {
    lines.push("");
    lines.push("Resume: not provided");
  }

  return lines.join("\n");
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportApplicationsZip(opts: ExportOptions): Promise<void> {
  const zip = new JSZip();
  for (const app of opts.applications) {
    const folderName = sanitizeZipEntryName(`${app.name} - ${firstChoiceLabel(app, opts)}`);
    const folder = zip.folder(folderName);
    if (!folder) continue;
    let text = buildApplicantText(app, opts);
    const resumePath = app.resume?.path;
    if (resumePath || app.resume?.url) {
      try {
        // Prefer our admin API (same-origin, no CORS, no signed-URL expiry); fall back to the stored signed URL.
        const url = resumePath
          ? `/api/admin/team-applications/resume?path=${encodeURIComponent(resumePath)}`
          : app.resume!.url!;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        folder.file(resumeFileName(app.resume?.path), buf);
      } catch {
        text += "\n\nResume: download failed (URL may have expired).\n";
      }
    }
    folder.file(`${folderName}.txt`, text);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const date = new Date().toISOString().slice(0, 10);
  const safeTitle = opts.campaignTitle.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
  downloadBlob(blob, `applications-${safeTitle || "export"}-${date}.zip`);
}
