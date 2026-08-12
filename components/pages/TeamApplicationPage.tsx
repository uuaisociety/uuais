"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles, Clock, ChevronDown, Check,
  Server, Code2,
  Megaphone, CalendarDays, FlaskConical, Rocket, User, Award,
  GraduationCap, Briefcase, Tag, Lock, Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldGroup, InputBase, SelectBase, TextareaBase } from "@/components/ui/Form";
import SearchableSelect from "@/components/ui/SearchableSelect";
import MultiStepWizard, { WizardStep } from "@/components/ui/MultiStepWizard";
import RoleRanker, { RoleRankEntry } from "@/components/ui/RoleRanker";
import FormattedText from "@/components/ui/FormattedText";
import HeroSplash from "@/components/HeroSplash";
import { LinkedInUrlInput, LINKEDIN_PREFIX } from "@/components/ui/LinkedInUrlInput";
import TagComponent from "@/components/ui/Tag";
import PDFDropzone from "@/components/ui/PDFDropzone";
import { useApp } from "@/contexts/AppContext";
import { useNotify } from "@/components/ui/Notifications";
import { auth, refreshSessionCookie } from "@/lib/firebase-client";
import { loginUrl } from "@/lib/login-redirect";
import { getUserProfile, type UserProfile } from "@/lib/firestore/users";
import { subscribeToCampaignQuestions } from "@/lib/firestore/campaignQuestions";
import { getTeamApplicationByUid } from "@/lib/firestore/teamApplications";
import { MAX_ROLE_RANKING } from "@/lib/constants";
import { ApplicationCampaign, CampaignQuestion, CampaignRole } from "@/types";
import {
  UU_PROGRAMMES,
  AREAS_OF_INTEREST,
  MOTIVATION_MAX_CHARS,
} from "./apply/sampleData";

const TEAM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  it: Server,
  development: Code2,
  growth: Megaphone,
  partnerships_events: CalendarDays,
  research: FlaskConical,
  vp: Award,
  other: Rocket,
};

const WIZARD_STEPS: WizardStep[] = [
  { key: "overview", title: "Overview" },
  { key: "profile", title: "Your Profile" },
  { key: "experience", title: "Experience" },
  { key: "roles", title: "Role Selection" },
  { key: "review", title: "Review" },
];

const TEAM_NAMES: Record<string, string> = {
  it: "IT",
  development: "Development",
  growth: "Growth",
  partnerships_events: "Partnerships & Events",
  research: "Research",
  vp: "Vice President",
  other: "Other",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_STANDARD_FIELDS = [
  "name", "email", "gender", "university", "program", "graduationYear",
  "linkedin", "resume", "interests", "teamRanking", "weeklyHours", "motivation",
];

interface TeamFormData {
  name: string;
  email: string;
  gender: string;
  university: string;
  program: string;
  expectedGraduationYear: string;
  linkedin: string;
  resume: File | null;
  interests: string[];
  customInterest: string;
  roleRanking: RoleRankEntry[];
  customRole: string;
  weeklyHours: number;
  motivation: string;
  customAnswers: Record<string, string | string[]>;
  agree: boolean;
  newsletter: boolean;
}

const emptyForm: TeamFormData = {
  name: "", email: "", gender: "", university: "Uppsala", program: "",
  expectedGraduationYear: "", linkedin: "", resume: null,
  interests: [], customInterest: "", roleRanking: [], customRole: "", weeklyHours: 5,
  motivation: "", customAnswers: {}, agree: false, newsletter: false,
};

const DRAFT_PREFIX = "teamApplicationDraft";

// Does the form hold anything worth persisting? An untouched form is skipped
// so we never create a draft the moment someone opens the page.
const hasDraftContent = (f: TeamFormData): boolean =>
  f.name !== "" || f.email !== "" || f.gender !== "" || f.university !== "Uppsala" ||
  f.program !== "" || f.expectedGraduationYear !== "" || f.linkedin !== "" ||
  f.resume !== null || f.interests.length > 0 || f.customInterest !== "" ||
  f.roleRanking.length > 0 || f.customRole !== "" || f.weeklyHours !== 5 ||
  f.motivation !== "" || f.agree || f.newsletter || Object.keys(f.customAnswers).length > 0;

// Collapsible rich-text description: starts clamped to 3 lines with an ellipsis,
// with a Show more/Show less toggle once it overflows.
const CollapsibleDescription: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded) return;
    const el = contentRef.current;
    if (!el) return;
    setNeedsToggle(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  return (
    <div>
      <div ref={contentRef} className={`${className} ${expanded ? "" : "line-clamp-3"}`}>
        <FormattedText text={text} />
      </div>
      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 transform-all ease-in-out duration-200 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Show more"}
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
};

export default function TeamApplicationPage() {
  const { state } = useApp();
  const { notify } = useNotify();
  const router = useRouter();
  const pathname = usePathname();
  const wizardRef = useRef<HTMLDivElement>(null);

  // Find the first open campaign
  const campaign: ApplicationCampaign | null = state.campaigns.find((c) => c.status === "open") || null;

  // Which standard fields this campaign actually wants shown/required
  const enabledFields = campaign?.enabledStandardFields?.length
    ? campaign.enabledStandardFields
    : DEFAULT_STANDARD_FIELDS;
  const fieldEnabled = (id: string) => enabledFields.includes(id);
  const roleSelectionEnabled = fieldEnabled("teamRanking");

  const [step, setStep] = useState(0);

  // Campaign deadline passed — lock the form
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  useEffect(() => {
    if (!campaign?.deadline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeadlinePassed(false);
      return;
    }
    const ms = Date.parse(campaign.deadline);
    // eslint-disable-next-line react-hooks/purity -- reading the clock inside an effect is intentional
    const passed = !Number.isNaN(ms) && ms <= Date.now();
    setDeadlinePassed(passed);
  }, [campaign]);
  const isPastDeadline = deadlinePassed;
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<TeamFormData>(emptyForm);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [customQuestions, setCustomQuestions] = useState<CampaignQuestion[]>([]);

  // Roles currently open in this campaign (respects per-role status + deadline)
  const [openRoles, setOpenRoles] = useState<CampaignRole[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  useEffect(() => {
    if (!campaign) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpenRoles([]);
      setRolesLoaded(false);
      return;
    }
    const now = Date.now();
    const open = (campaign.roles || []).filter(
      (r) => r.status === "open" && (!r.deadline || Date.parse(r.deadline) >= now)
    );
    setOpenRoles(open);
    setRolesLoaded(true);
  }, [campaign]);

  // Check if the current user has already applied (via verified uid; rules allow self-read).
  const [hasApplied, setHasApplied] = useState(false);
  useEffect(() => {
    // Once submitted, freeze hasApplied so the app-created subscription can't flash "Already Applied!".
    if (submitted || submitting) return;
    const uid = auth.currentUser?.uid;
    if (!campaign?.id || !uid || authLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasApplied(false);
      return;
    }
    // First check from reactive state if available (fast path, admin only)
    if (state.teamApplications.some(
      (a) => a.uid === uid && a.campaignId === campaign.id
    )) {
      setHasApplied(true);
      return;
    }
    const t = setTimeout(() => {
      getTeamApplicationByUid(uid, campaign.id)
        .then((app) => setHasApplied(!!app))
        .catch(() => setHasApplied(false));
    }, 600);
    return () => clearTimeout(t);
  }, [campaign?.id, authLoading, state.teamApplications, submitted, submitting]);

  // Subscribe to custom questions for the active campaign
  useEffect(() => {
    if (!campaign?.id) return;
    const unsub = subscribeToCampaignQuestions(campaign.id, (qs) => setCustomQuestions(qs));
    return () => unsub();
  }, [campaign?.id]);

  // Prefill from auth profile
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { setAuthLoading(false); return; }
      setForm((prev) => ({
        ...prev,
        name: prev.name || user.displayName || "",
        email: prev.email || user.email || "",
      }));
      try {
        const p = await getUserProfile(user.uid);
        if (p) {
          setProfile(p);
          setForm((prev) => ({
            ...prev,
            name: prev.name || p.name || p.displayName || "",
            email: prev.email || p.email || "",
            gender: prev.gender || p.gender || "",
            university: prev.university || p.university || "Uppsala",
            program: prev.program || p.program || "",
            expectedGraduationYear: prev.expectedGraduationYear || (p.expectedGraduationYear ? String(p.expectedGraduationYear) : ""),
            linkedin: prev.linkedin || p.linkedin || "",
          }));
        }
      } catch { /* ignore */ }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Restore a pending application saved before login redirect
  useEffect(() => {
    if (authLoading) return;
    const raw = sessionStorage.getItem("pendingApplication");
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Partial<TeamFormData>;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((prev) => ({ ...prev, ...saved }));
      sessionStorage.removeItem("pendingApplication");
      // Jump to the experience step so they can re-attach their resume
      setStep(2);
      notify({ type: "info", title: "Application restored", message: "Please re-attach your resume before submitting." });
    } catch {
      sessionStorage.removeItem("pendingApplication");
    }
  }, [authLoading, notify]);

  // Reset preferences when the campaign changes so stale rankings from another campaign don't bleed in.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((prev) => ({ ...prev, roleRanking: [], customRole: "" }));
  }, [campaign?.id]);

  // --- Draft persistence -----------------------------------------------------
  // A draft survives reloads, tab switches, and interruptions. Keyed by
  // campaign + user so sessions never bleed into each other. The resume File
  // can't be serialized — we remember it was attached and ask again on restore.
  const draftKey = campaign ? `${DRAFT_PREFIX}:${campaign.id}:${auth.currentUser?.uid || "anon"}` : null;
  const draftRestoredRef = useRef(false);

  // Restore the saved draft once, after auth and the campaign have settled.
  useEffect(() => {
    if (authLoading || !draftKey || submitted || submitting || hasApplied) return;
    if (draftRestoredRef.current) return;
    draftRestoredRef.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<TeamFormData> & { resumeAttached?: boolean; step?: number };
      const { resumeAttached, ...fields } = saved;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((prev) => ({ ...prev, ...fields, resume: null }));
      if (typeof saved.step === "number" && saved.step > 0 && saved.step < WIZARD_STEPS.length) {
        setStep(saved.step);
      }
      notify({
        type: "info",
        title: resumeAttached ? "Draft restored — resume needed" : "Draft restored",
        message: resumeAttached
          ? "We saved your application. Please re-attach your resume before submitting."
          : "We saved your application so you can pick up where you left off.",
      });
    } catch {
      localStorage.removeItem(draftKey);
    }
  }, [authLoading, draftKey, submitted, submitting, hasApplied, notify]);

  // Auto-save once the user has engaged (step > 0) and holds real content.
  useEffect(() => {
    if (!draftKey || submitted || submitting || authLoading) return;
    if (step === 0 || !hasDraftContent(form)) return;
    const t = setTimeout(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { resume: _resume, ...rest } = form;
        localStorage.setItem(draftKey, JSON.stringify({ ...rest, step, resumeAttached: !!form.resume }));
      } catch { /* quota or private mode — persistence is best-effort */ }
    }, 400);
    return () => clearTimeout(t);
  }, [form, step, draftKey, submitted, submitting, authLoading]);

  // Warn before closing/reloading once a draft exists past the overview step.
  useEffect(() => {
    if (step === 0 || !hasDraftContent(form) || submitted) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [form, step, submitted]);


  const set = <K extends keyof TeamFormData>(field: K, val: TeamFormData[K]) =>
    setForm((p) => ({ ...p, [field]: val }));
  const setCustom = (qId: string, val: string | string[]) =>
    setForm((p) => ({ ...p, customAnswers: { ...p.customAnswers, [qId]: val } }));

  const toggleInterest = (id: string) =>
    setForm((p) => ({
      ...p,
      interests: p.interests.includes(id) ? p.interests.filter((i) => i !== id) : [...p.interests, id],
    }));

  const teamNameFor = (teamId: string) =>
    campaign?.teamInfo?.[teamId]?.name || TEAM_NAMES[teamId] || teamId;

  const handleNext = () => {
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
    setTimeout(() => wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };
  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    if (step === 1) setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 80);
  };

  const handleSubmit = async () => {
    if (!form.agree) return;
    if (!campaign) return;
    if (hasApplied) {
      notify({ type: "error", title: "Already applied", message: "You have already submitted an application for this campaign." });
      return;
    }
    if (!auth.currentUser) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { resume: _resume, ...rest } = form;
      sessionStorage.setItem("pendingApplication", JSON.stringify(rest));
      router.push("/login?redirect=/apply/team");
      return;
    }
    // Refresh the httpOnly session cookie (only set at /api/login) so a prior account doesn't 409 the dedup lock.
    try {
      await refreshSessionCookie();
    } catch { /* best-effort; the apply call surfaces auth errors */ }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("campaignId", campaign.id);
      fd.append("name", form.name);
      fd.append("email", form.email);
      if (fieldEnabled("gender")) fd.append("gender", form.gender);
      if (fieldEnabled("university")) fd.append("university", form.university);
      if (fieldEnabled("program")) fd.append("program", form.program);
      if (fieldEnabled("graduationYear")) fd.append("graduationYear", form.expectedGraduationYear);
      if (fieldEnabled("linkedin")) fd.append("linkedin", form.linkedin);
      if (roleSelectionEnabled) {
        fd.append("roleRanking", JSON.stringify(
          form.roleRanking.filter((r) => !r.custom).map((r) => ({
            roleId: r.roleId,
            teamId: r.teamId,
            justification: r.justification,
          }))
        ));
        fd.append("customRole", form.customRole);
      }
      if (fieldEnabled("weeklyHours")) fd.append("weeklyHours", String(form.weeklyHours));
      if (fieldEnabled("motivation")) fd.append("motivation", form.motivation);
      fd.append("agree", String(form.agree));
      fd.append("newsletter", String(form.newsletter));
      if (fieldEnabled("interests")) {
        fd.append("interests", JSON.stringify(form.interests));
        fd.append("customInterest", form.customInterest);
      }
      fd.append("customAnswers", JSON.stringify(form.customAnswers));
      if (fieldEnabled("resume") && form.resume) fd.append("resume", form.resume, form.resume.name);

      const res = await fetch("/api/applications", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        notify({ type: "error", title: "Submission failed", message: json?.error || "Unknown error" });
        if (json?.code === "DUPLICATE_CAMPAIGN") setHasApplied(true);
        return;
      }
      setSubmitted(true);
      notify({ type: "success", title: "Application submitted!", message: "We'll be in touch soon." });
      try { if (draftKey) localStorage.removeItem(draftKey); } catch { /* best-effort */ }
    } catch (err) {
      console.error("Submit error", err);
      notify({ type: "error", title: "Submission failed", message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // No open campaigns (loaded, but none are currently open)
  if (state.campaignsLoaded && !campaign) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 transition-colors duration-300 flex items-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-foreground/10 flex items-center justify-center mx-auto mb-6">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">No active campaigns</h1>
          <p className="text-muted-foreground">There are no open application campaigns right now. Please check back later.</p>
        </div>
      </div>
    );
  }

  // No campaigns at all (loading or not configured)
  if (!campaign) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 transition-colors duration-300 flex items-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading campaigns…</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 transition-colors duration-300 flex items-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Application Submitted!</h1>
          <p className="text-muted-foreground mb-6">
            Thank you, {form.name.split(" ")[0] || "applicant"}. Your application for{" "}
            <strong className="text-primary">{campaign.title}</strong>&nbsp;has been received.
            We&apos;ll contact you at {form.email || "your email"}.
          </p>
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Already applied — no further actions available
  if (hasApplied) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 transition-colors duration-300">
        <div className="max-w-md mx-auto px-4 text-center mt-16">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Already Applied!</h1>
          <p className="text-muted-foreground mb-6">
            You have already submitted an application for{" "}
            <strong className="text-primary">{campaign.title}</strong>.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Button asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Campaign deadline has passed
  if (isPastDeadline) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 transition-colors duration-300 flex items-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Applications Closed</h1>
          <p className="text-muted-foreground mb-6">
            The application deadline for{" "}
            <strong className="text-primary">{campaign.title}</strong>&nbsp;has passed
            ({campaign.deadline}). We&apos;re no longer accepting submissions.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Role selection is enabled but no roles are currently open — nothing to apply for.
  if (roleSelectionEnabled && rolesLoaded && openRoles.length === 0) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 transition-colors duration-300 flex items-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-chart-3/15 flex items-center justify-center mx-auto mb-6">
            <Briefcase className="h-8 w-8 text-chart-3" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">No roles are open right now</h1>
          <p className="text-muted-foreground mb-6">
            {campaign.title} is not currently accepting role applications. Please check back later.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  // If not signed in, the form still renders but submission will require
  // sign-in (redirect handled in handleSubmit).
  const requiredCustomAnswered = customQuestions
    .filter((q) => q.required)
    .every((q) => {
      const ans = form.customAnswers[q.id];
      if (Array.isArray(ans)) return ans.length > 0;
      return typeof ans === "string" && ans.trim().length > 0;
    });

  const realRoleRanking = form.roleRanking.filter((r) => !r.custom);
  const roleSelectionValid = !roleSelectionEnabled || realRoleRanking.length > 0;

  const canNext =
    step === 0 ? true :
    step === 1 ? !!form.name.trim() && EMAIL_RE.test(form.email.trim()) :
    step === 2 ? (!fieldEnabled("linkedin") || form.linkedin.trim().length > LINKEDIN_PREFIX.length) && (!fieldEnabled("interests") || form.interests.length > 0 || !!form.customInterest.trim()) && requiredCustomAnswered :
    step === 3 ? (!fieldEnabled("motivation") || form.motivation.trim().length >= 25) && roleSelectionValid :
    true;

  // Tells the user exactly what's still missing when Continue is blocked —
  // a disabled button without a reason reads as a wall.
  const nextDisabledHint =
    step === 1
      ? !form.name.trim()
        ? "Enter your full name to continue."
        : "Enter a valid email address to continue."
      : step === 2
        ? fieldEnabled("linkedin") && form.linkedin.trim().length <= LINKEDIN_PREFIX.length
          ? "Add your full LinkedIn URL to continue."
          : fieldEnabled("interests") && form.interests.length === 0 && !form.customInterest.trim()
            ? "Select at least one area of interest to continue."
            : "Answer the required additional questions to continue."
        : step === 3
          ? fieldEnabled("motivation") && form.motivation.trim().length < 25
            ? `Write at least 25 characters of motivation (${form.motivation.trim().length} so far).`
            : "Rank at least one role to continue."
          : undefined;

  const submitDisabled = !form.agree || submitting;
  const submitDisabledHint =
    !form.agree && !submitting
      ? "Confirm that your information is accurate to submit."
      : undefined;

  const campaignRoles = campaign.roles && campaign.roles.length > 0 ? campaign.roles : [];
  const teamsWithRoles = campaign.teams.map((teamId) => ({
    teamId,
    roles: campaignRoles.filter((r) => r.teamId === teamId && r.status === "open"),
  })).filter((t) => t.roles.length > 0);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Hero header — full on step 0, compact on steps 1+ */}
      {step === 0 ? (
        <HeroSplash className="min-h-[50vh]">
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
            <p className="mono-label text-current/65 mb-6 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {campaign.subtitle}
            </p>
            <h1 className="display-lg mb-6">
              {campaign.title}
            </h1>
            <p className="text-base sm:text-lg text-current/60 mb-6 max-w-2xl leading-relaxed">
              {campaign.description}
            </p>
            <div className="flex items-center gap-2 text-current/65">
              <Clock className="h-5 w-5" />
              <span>Application deadline: {campaign.deadline}</span>
            </div>
            <a href="#wizard" className="inline-block mt-10 motion-safe:animate-bounce" aria-label="Skip to application form">
              <ChevronDown className="h-7 w-7 text-current/30" aria-hidden />
            </a>
          </div>
        </HeroSplash>
      ) : (
        <HeroSplash className="py-5 pt-28">
          <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-xl font-bold">{campaign.title}</h1>
            <p className="text-sm text-current/60">{campaign.subtitle}</p>
          </div>
        </HeroSplash>
      )}

      {/* Wizard */}
      <div id="wizard" ref={wizardRef} className="scroll-mt-24 py-12 bg-background min-h-screen">
        <MultiStepWizard
          steps={WIZARD_STEPS}
          currentStep={step}
          onNext={handleNext}
          onBack={handleBack}
          onSubmit={handleSubmit}
          canNext={canNext}
          canBack={true}
          submitLabel="Submit application"
          submitDisabled={submitDisabled}
          nextDisabledHint={nextDisabledHint}
          submitDisabledHint={submitDisabledHint}
        >
          {/* Step 0: Overview */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">Who we&apos;re looking for</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We are looking for passionate students curious about AI, willing to learn, and
                  excited to contribute to the community to join us. No prior experience is required your
                  enthusiasm and willingness to grow are what matter most.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Open Roles</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Explore the roles you can apply for.
                </p>
                {teamsWithRoles.length === 0 ? (
                  <Card>
                    <div className="p-5 text-sm text-muted-foreground">
                      No roles are open right now. Please check back later.
                    </div>
                  </Card>
                ) : (
                  <div className="grid gap-4 grid-cols-1">
                    {teamsWithRoles.map(({ teamId, roles }) => {
                      const teamOverride = campaign.teamInfo?.[teamId];
                      const teamName = teamOverride?.name || TEAM_NAMES[teamId] || teamId;
                      const teamDescription = teamOverride?.description || `Join the ${teamName} team and contribute to the society.`;
                      const Icon = TEAM_ICONS[teamId] || Rocket;
                      return (
                        <Card key={teamId} variant="default" hover className="group">
                          <div className="p-5 sm:p-6">
                            <div className="flex items-start gap-4">
                              <div className="shrink-0 w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-foreground break-words">{teamName}</h4>
                                <CollapsibleDescription text={teamDescription} className="text-sm text-muted-foreground mt-1" />
                              </div>
                            </div>
                            <div className="mt-5">
                              {roles.map((role, idx) => (
                                <React.Fragment key={role.id}>
                                  {idx > 0 && (
                                    <div className="flex items-center gap-2" aria-hidden>
                                      <div className="flex-1 border-t border-border" />
                                      <span className="text-foreground/40 text-xs">---</span>
                                      <div className="flex-1 border-t border-border" />
                                    </div>
                                  )}
                                  <div className="py-4 first:pt-0 last:pb-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm font-semibold text-foreground break-words">{role.title}</span>
                                      <TagComponent variant="green" size="sm">Open</TagComponent>
                                    </div>
                                    {role.description && (
                                      <CollapsibleDescription text={role.description} className="text-sm text-muted-foreground mt-1.5" />
                                    )}
                                    {role.deadline && (
                                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> Deadline: {role.deadline}
                                      </p>
                                    )}
                                  </div>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
              {!form.email && (
                <div className="flex items-center gap-2 text-sm text-chart-3 bg-chart-3/10 rounded-md p-3 border border-chart-3/40">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>
                    You need to <Link href={loginUrl(pathname)} className="underline font-medium">sign in</Link> or{" "}
                    <Link href="/join" className="underline font-medium">register</Link> to submit your application.
                    You can still fill the form now and sign in before submitting.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Profile */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">Your Profile</h2>
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  {profile ? "We've prefilled your details from your account." : "Please fill in your details."}
                </p>
              </div>
              <Card>
                <div className="p-6 space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FieldGroup label="Full name" requiredHint="Required.">
                      <InputBase maxLength={100} value={form.name} onChange={(e) => set("name", e.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Email" requiredHint="Required.">
                      <InputBase type="email" maxLength={254} value={form.email} onChange={(e) => set("email", e.target.value)} />
                    </FieldGroup>
                  </div>
                  {fieldEnabled("gender") && (
                    <FieldGroup label="Gender" requiredHint="Optional.">
                      <SelectBase value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                        <option value="">Prefer not to say</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="nonbinary">Non-binary</option>
                        <option value="other">Other</option>
                      </SelectBase>
                    </FieldGroup>
                  )}
                  {(fieldEnabled("university") || fieldEnabled("program")) && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {fieldEnabled("university") && (
                        <FieldGroup label="University" requiredHint="Required if student.">
                          <SelectBase value={form.university} onChange={(e) => set("university", e.target.value)}>
                            <option value="Uppsala">Uppsala University</option>
                            <option value="none">None</option>
                            <option value="other">Other</option>
                          </SelectBase>
                        </FieldGroup>
                      )}
                      {fieldEnabled("program") && (
                        <FieldGroup label="Program" requiredHint="Required if student.">
                          <SearchableSelect
                            value={form.program}
                            onChange={(v) => set("program", v)}
                            options={UU_PROGRAMMES}
                            placeholder="Type to search your programme"
                          />
                        </FieldGroup>
                      )}
                    </div>
                  )}
                  {fieldEnabled("graduationYear") && (
                    <FieldGroup label="Expected graduation year" requiredHint="Optional">
                      <InputBase
                        type="number"
                        min={1900}
                        max={2100}
                        maxLength={4}
                        placeholder="e.g. 2027"
                        value={form.expectedGraduationYear}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v.length <= 4) set("expectedGraduationYear", v);
                        }}
                      />
                    </FieldGroup>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Step 2: Experience */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">Experience &amp; Interests</h2>
                <p className="text-sm text-muted-foreground mb-2">
                  Tell us about your professional presence and what areas of AI excite you.
                </p>
              </div>
              <Card>
                <div className="p-6 space-y-5">
                  {fieldEnabled("linkedin") && (
                    <FieldGroup label="LinkedIn URL" requiredHint="Required.">
                      <LinkedInUrlInput value={form.linkedin} onChange={(v) => set("linkedin", v)} />
                    </FieldGroup>
                  )}
                  {fieldEnabled("resume") && (
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-2">
                        Resume / CV (PDF, max 3MB) <span className="text-[11px] font-normal text-muted-foreground">Optional.</span>
                      </label>
                      <PDFDropzone
                        file={form.resume}
                        onChange={(f) => set("resume", f)}
                        onError={(msg) => notify({ type: "error", title: "Resume upload", message: msg })}
                      />
                    </div>
                  )}
                  {fieldEnabled("interests") && (
                    <div className="pt-2 border-t border-border">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-1 mt-4">
                      Areas of Interest
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" /> Select at least one area that excites you.
                    </p>
                    <div className="space-y-2">
                      {AREAS_OF_INTEREST.map((area) => {
                        const checked = form.interests.includes(area.id);
                        return (
                          <label
                            key={area.id}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-all duration-200 ${
                              checked
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleInterest(area.id)}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                            />
                            <span className={`text-sm font-medium ${checked ? "text-primary" : "text-foreground"}`}>
                              {area.label}
                            </span>
                          </label>
                        );
                      })}
                      <label className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                        form.customInterest.trim()
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}>
                        <span className="text-sm font-medium text-foreground shrink-0">Other:</span>
                        <input
                          type="text"
                          placeholder="Describe your area of interest"
                          maxLength={200}
                          value={form.customInterest}
                          onChange={(e) => set("customInterest", e.target.value)}
                          className="flex-1 px-2 py-1 text-sm rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors duration-300"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      {form.interests.length} area{form.interests.length !== 1 ? "s" : ""} selected
                    </p>
                  </div>
                  )}

                  {/* Custom questions */}
                  {customQuestions.length > 0 && (
                    <div className="pt-4 border-t border-border space-y-4">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                        Additional Questions
                      </h3>
                      {customQuestions.map((q) => (
                        <div key={q.id}>
                          {q.type === "text" && (
                            <FieldGroup label={q.question} requiredHint={q.required ? "Required." : "Optional."}>
                              <InputBase
                                maxLength={500}
                                value={(form.customAnswers[q.id] as string) || ""}
                                onChange={(e) => setCustom(q.id, e.target.value)}
                              />
                            </FieldGroup>
                          )}
                          {q.type === "textarea" && (
                            <FieldGroup label={q.question} requiredHint={q.required ? "Required." : "Optional."}>
                              <TextareaBase
                                rows={4}
                                maxLength={2000}
                                value={(form.customAnswers[q.id] as string) || ""}
                                onChange={(e) => setCustom(q.id, e.target.value)}
                              />
                            </FieldGroup>
                          )}
                          {q.type === "select" && (
                            <FieldGroup label={q.question} requiredHint={q.required ? "Required." : "Optional."}>
                              <SelectBase
                                value={(form.customAnswers[q.id] as string) || ""}
                                onChange={(e) => setCustom(q.id, e.target.value)}
                              >
                                <option value="">Select an option</option>
                                {q.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                              </SelectBase>
                            </FieldGroup>
                          )}
                          {q.type === "radio" && (
                            <div className="flex flex-col gap-2">
                              <span className="text-xs font-medium text-foreground">
                                {q.question} <span className="ml-1 text-[11px] font-normal text-muted-foreground">{q.required ? "Required." : "Optional."}</span>
                              </span>
                              {q.options?.map((o) => (
                                <label key={o} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                  <input type="radio" name={q.id} checked={form.customAnswers[q.id] === o} onChange={() => setCustom(q.id, o)} className="accent-primary" />
                                  {o}
                                </label>
                              ))}
                            </div>
                          )}
                          {q.type === "checkbox" && (
                            <div className="flex flex-col gap-2">
                              <span className="text-xs font-medium text-foreground">
                                {q.question} <span className="ml-1 text-[11px] font-normal text-muted-foreground">{q.required ? "Required." : "Optional."}</span>
                              </span>
                              <div className="flex flex-wrap gap-3">
                                {q.options?.map((o) => {
                                  const arr = (form.customAnswers[q.id] as string[]) || [];
                                  return (
                                    <label key={o} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={arr.includes(o)}
                                        onChange={(e) => { if (e.target.checked) setCustom(q.id, [...arr, o]); else setCustom(q.id, arr.filter((a) => a !== o)); }}
                                        className="accent-primary"
                                      />
                                      {o}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Step 3: Role Selection */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">Role Selection</h2>
                <p className="text-sm text-muted-foreground mb-2">
                  Rank the roles you&apos;d like to join by preference, set your availability, and tell us
                  why you want to contribute.
                </p>
              </div>
              <Card>
                <div className="p-6 space-y-6">
                  {roleSelectionEnabled && (
                    <RoleRanker
                      ranking={form.roleRanking}
                      onChange={(ranking) => set("roleRanking", ranking)}
                      availableRoles={openRoles}
                      teamName={teamNameFor}
                      iconMap={TEAM_ICONS}
                      maxRanking={MAX_ROLE_RANKING}
                      customRole={form.customRole}
                      onCustomRoleChange={(val) => set("customRole", val)}
                    />
                  )}
                  {fieldEnabled("weeklyHours") && (
                    <div className="pt-4 border-t border-border">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                        Weekly Availability
                      </h3>
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <input
                            type="range"
                            min={0}
                            max={12}
                            step={1}
                            value={form.weeklyHours}
                            onChange={(e) => set("weeklyHours", Number(e.target.value))}
                            aria-label="Weekly availability (hours)"
                            aria-valuetext={`${form.weeklyHours} hours per week`}
                            className="w-full accent-primary"
                          />
                          {/* Labels aligned under the slider (this column only) */}
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>Casual</span>
                            <span>Few hrs</span>
                            <span>Committed</span>
                            <span>Very active</span>
                          </div>
                        </div>
                        <div className="shrink-0 min-w-[8rem] text-right pt-1">
                          <span className="text-lg font-bold text-primary">
                            {form.weeklyHours}
                          </span>
                          <span className="text-sm text-muted-foreground ml-1">
                            hour{form.weeklyHours !== 1 ? "s" : ""}/week
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {fieldEnabled("motivation") && (
                    <div className="pt-4 border-t border-border">
                      <FieldGroup label="Personal motivation" requiredHint="Required.">
                        <TextareaBase
                          placeholder="Tell us why you want to join UU AI Society and what you hope to contribute."
                          value={form.motivation}
                          onChange={(e) => set("motivation", e.target.value)}
                          maxLength={MOTIVATION_MAX_CHARS}
                          rows={5}
                        />
                      </FieldGroup>
                      <p className={`text-xs mt-1 ${
                        (form.motivation || "").length > MOTIVATION_MAX_CHARS ? "text-primary" :
                        (form.motivation || "").trim().length < 25 && (form.motivation || "").length > 0 ? "text-chart-3" :
                        "text-muted-foreground"
                      }`}>
                        {(form.motivation || "").trim().length < 25 && (form.motivation || "").length > 0
                          ? `Need ${25 - form.motivation.trim().length} more characters — `
                          : ""
                        }
                        {(form.motivation || "").length} / {MOTIVATION_MAX_CHARS} characters
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">Review &amp; Submit</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Please review your application before submitting.
                </p>
              </div>
              <Card>
                <div className="p-6 space-y-5">
                  <SummarySection icon={GraduationCap} title="Profile">
                    <SummaryRow label="Name" value={form.name} />
                    <SummaryRow label="Email" value={form.email} />
                    {fieldEnabled("gender") && <SummaryRow label="Gender" value={form.gender || "Prefer not to say"} />}
                    {fieldEnabled("university") && <SummaryRow label="University" value={form.university === "Uppsala" ? "Uppsala University" : form.university} />}
                    {fieldEnabled("program") && <SummaryRow label="Program" value={form.program || "—"} />}
                    {fieldEnabled("graduationYear") && <SummaryRow label="Graduation year" value={form.expectedGraduationYear || "—"} />}
                  </SummarySection>
                  <SummarySection icon={Briefcase} title="Experience & Interests">
                    {fieldEnabled("linkedin") && <SummaryRow label="LinkedIn" value={form.linkedin} />}
                    {fieldEnabled("resume") && <SummaryRow label="Resume" value={form.resume?.name || "Not uploaded"} />}
                    {fieldEnabled("interests") && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {form.interests.map((id) => {
                        const area = AREAS_OF_INTEREST.find((a) => a.id === id);
                        return area ? <TagComponent key={id} variant="red" size="sm">{area.label}</TagComponent> : null;
                      })}
                      {form.customInterest.trim() && <TagComponent key="custom-interest" variant="red" size="sm">{form.customInterest}</TagComponent>}
                      {form.interests.length === 0 && !form.customInterest.trim() && <span className="text-sm text-muted-foreground">No areas selected</span>}
                    </div>
                    )}
                    {customQuestions.length > 0 && (
                      <div className="pt-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase">Additional answers</span>
                        {customQuestions.map((q) => {
                          const ans = form.customAnswers[q.id];
                          const displayAns = Array.isArray(ans) ? ans.join(", ") : ans;
                          return (
                            <div key={q.id} className="mt-1">
                              <span className="text-xs font-medium text-muted-foreground">{q.question}</span>
                              <p className="text-sm text-foreground break-words">{displayAns || "—"}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </SummarySection>
                  <SummarySection icon={User} title="Role Selection">
                    {roleSelectionEnabled && form.roleRanking.map((entry, idx) => {
                      if (!entry.custom) {
                        return (
                          <div key={entry.roleId}>
                            <div className="flex items-center gap-3 py-1">
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                                idx === 0 ? "bg-primary text-primary-foreground" : "bg-foreground/8 text-muted-foreground"
                              }`}>
                                {idx + 1}
                              </span>
                              <span className="flex-1 min-w-0 text-sm text-foreground break-words">{entry.title} <span className="text-muted-foreground">· {entry.teamName}</span></span>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key="custom-role" className="flex items-center gap-3 py-1">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-foreground/8 text-muted-foreground text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="flex-1 min-w-0 text-sm text-foreground break-words">
                            Other{form.customRole ? `: ${form.customRole}` : ""}
                          </span>
                        </div>
                      );
                    })}
                    {fieldEnabled("weeklyHours") && <SummaryRow label="Availability" value={`${form.weeklyHours} hour${form.weeklyHours !== 1 ? "s" : ""} per week`} />}
                    {fieldEnabled("motivation") && (
                    <div className="pt-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase">Motivation</span>
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words mt-1">
                        {form.motivation || "—"}
                      </p>
                    </div>
                    )}
                  </SummarySection>
                  <label className="flex items-start gap-3 text-sm text-foreground pt-2 border-t border-border">
                    <input type="checkbox" checked={form.agree} onChange={(e) => set("agree", e.target.checked)} className="mt-0.5 accent-primary" />
                    <span>
                      I confirm the information above is accurate and agree to the{" "}
                      <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={form.newsletter}
                      onChange={(e) => set("newsletter", e.target.checked)}
                      className="mt-0.5 accent-primary"
                    />
                    <span>
                      Also sign me up for the UU AI Society newsletter{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </span>
                  </label>
                  {submitting && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </MultiStepWizard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function SummarySection({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="pb-4 border-b border-border last:border-0 last:pb-0">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 py-1">
      <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>
      <span className="sm:col-span-2 text-sm text-foreground break-words min-w-0">{value || "—"}</span>
    </div>
  );
}
