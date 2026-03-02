"use client";

import React, { useState } from "react";
import type { EligibilityResult, EvaluatedRequirement } from "@/lib/eligibility/engine";
import { CheckCircle2, AlertTriangle, XCircle, Lock, ChevronDown, ChevronUp } from "lucide-react";

type Status = "eligible" | "partial" | "ineligible" | "unknown";

function getStatus(result: EligibilityResult | null): Status {
    if (!result) return "unknown";
    if (result.eligible) return "eligible";
    // If there are some satisfied requirements, it's partial
    if (result.satisfiedRequirements.length > 0) return "partial";
    return "ineligible";
}

const STATUS_CONFIG: Record<Status, { icon: React.ReactNode; label: string; className: string; bgClass: string }> = {
    eligible: {
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        label: "Fully eligible",
        className: "text-green-700 dark:text-green-400",
        bgClass: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    },
    partial: {
        icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
        label: "Missing requirements",
        className: "text-amber-700 dark:text-amber-400",
        bgClass: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    },
    ineligible: {
        icon: <XCircle className="h-5 w-5 text-red-500" />,
        label: "Not eligible",
        className: "text-red-700 dark:text-red-400",
        bgClass: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    },
    unknown: {
        icon: <Lock className="h-5 w-5 text-gray-400" />,
        label: "Upload transcript to check",
        className: "text-gray-600 dark:text-gray-400",
        bgClass: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
    },
};

function RequirementTreeNode({ node, depth = 0 }: { node: EvaluatedRequirement; depth?: number }) {
    const [expanded, setExpanded] = useState(depth < 2);

    const hasChildren = node.children && node.children.length > 0;
    const icon = node.met
        ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
        : <XCircle className="h-4 w-4 text-red-400 shrink-0" />;

    return (
        <div className={`${depth > 0 ? 'ml-4 border-l border-gray-200 dark:border-gray-700 pl-3' : ''}`}>
            <div className="flex items-start gap-2 py-1">
                {icon}
                <div className="flex-1 min-w-0">
                    <button
                        onClick={hasChildren ? () => setExpanded(!expanded) : undefined}
                        className={`text-sm text-left ${hasChildren ? 'cursor-pointer hover:underline' : ''} ${node.met ? 'text-gray-700 dark:text-gray-300' : 'text-red-700 dark:text-red-400 font-medium'
                            }`}
                    >
                        {node.label || node.details || node.requirement.type}
                        {hasChildren && (
                            <span className="inline-block ml-1">
                                {expanded ? <ChevronUp className="h-3 w-3 inline" /> : <ChevronDown className="h-3 w-3 inline" />}
                            </span>
                        )}
                    </button>
                    {node.details && !hasChildren && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{node.details}</div>
                    )}
                </div>
            </div>
            {hasChildren && expanded && (
                <div className="mt-1">
                    {node.children!.map((child, i) => (
                        <RequirementTreeNode key={i} node={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

type Props = {
    result: EligibilityResult | null;
    showDetails?: boolean;
    compact?: boolean;
    onUploadClick?: () => void;
};

export default function EligibilityBadge({ result, showDetails = true, compact = false, onUploadClick }: Props) {
    const [detailsOpen, setDetailsOpen] = useState(false);
    const status = getStatus(result);
    const config = STATUS_CONFIG[status];

    if (compact) {
        return (
            <span className={`inline-flex items-center gap-1.5 text-sm ${config.className}`}>
                {config.icon}
                {config.label}
            </span>
        );
    }

    return (
        <div className={`rounded-lg border p-4 ${config.bgClass}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {config.icon}
                    <span className={`font-medium ${config.className}`}>{config.label}</span>
                </div>
                {status === "unknown" && onUploadClick && (
                    <button
                        onClick={onUploadClick}
                        className="text-sm text-[#990000] hover:text-[#7f0000] font-medium"
                    >
                        Upload transcript →
                    </button>
                )}
                {result && showDetails && (
                    <button
                        onClick={() => setDetailsOpen(!detailsOpen)}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        {detailsOpen ? "Hide details" : "Show details"}
                    </button>
                )}
            </div>

            {/* Quick summary */}
            {result && !result.eligible && !detailsOpen && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {result.missingCourses.length > 0 && (
                        <span>Missing {result.missingCourses.length} course{result.missingCourses.length > 1 ? 's' : ''}. </span>
                    )}
                    {result.missingCredits.length > 0 && (
                        <span>{result.missingCredits.length} credit requirement{result.missingCredits.length > 1 ? 's' : ''} unmet. </span>
                    )}
                    {result.missingTopics.length > 0 && (
                        <span>{result.missingTopics.length} topic{result.missingTopics.length > 1 ? 's' : ''} missing. </span>
                    )}
                </div>
            )}

            {/* Full details */}
            {detailsOpen && result && (
                <div className="mt-4 space-y-4">
                    {/* Evaluation tree */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Requirements Breakdown</h4>
                        <RequirementTreeNode node={result.evaluationTree} />
                    </div>

                    {/* Missing courses */}
                    {result.missingCourses.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Missing Courses</h4>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                {result.missingCourses.map((c, i) => (
                                    <li key={i} className="flex items-center gap-2">
                                        <XCircle className="h-3 w-3 text-red-400 shrink-0" />
                                        {c.title} ({c.courseCode})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Satisfied requirements */}
                    {result.satisfiedRequirements.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Satisfied Requirements</h4>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                {result.satisfiedRequirements.map((r, i) => (
                                    <li key={i} className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                        {r}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
