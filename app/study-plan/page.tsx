import React from "react";
//import { fetchCourses } from "@/lib/courses";
import { updatePageMeta } from "@/utils/seo";

export default async function StudyPlanPage() {
    updatePageMeta("Study Plan Explorer", "Visualize your entire degree pathway");

    // Server-side fetch
    //const courses = await fetchCourses();

    // For a full study plan, we'd build a global graph of all courses. 
    // Given the performance impact of rendering thousands of nodes, a production version 
    // typically filters by program or domain. Here is the placeholder for the full graph view.

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">Study Plan Visualization</h1>
                    <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                        Explore long-term academic pathways and dependencies across the entire university catalog.
                        (Feature currently under construction for large-scale graph rendering).
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                    <h2 className="text-xl font-semibold mb-2">Global Course Graph coming soon</h2>
                    <p className="text-gray-500 max-w-lg mx-auto">
                        This interactive tool will let you simulate completion of prerequisite chains, visualize specializations, and plan a multi-year degree structure.
                    </p>
                    <div className="mt-8 relative max-w-3xl mx-auto h-64 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                        <div className="animate-pulse flex items-center gap-2 text-gray-400">
                            <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                            <div className="w-16 h-1 bg-gray-400 rounded"></div>
                            <div className="w-6 h-6 rounded bg-gray-400"></div>
                            <div className="w-16 h-1 bg-gray-400 rounded"></div>
                            <div className="w-4 h-4 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
