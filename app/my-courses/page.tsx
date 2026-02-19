"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchCourses, type Course } from "@/lib/courses";
import CourseCard from "@/components/courses/CourseCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { auth } from "@/lib/firebase-client";
import { onAuthStateChanged } from "firebase/auth";
import { getUserFavorites } from "@/lib/firestore/favorites";
import { getUserCategories, createCategory, deleteCategory, getCategoryCourses } from "@/lib/firestore/course-categories";
import { CourseCategory } from "@/types";
import { Heart, Plus, Trash2, Folder, X } from "lucide-react";
import Link from "next/link";
import { updatePageMeta } from "@/utils/seo";
import { useAdmin } from "@/hooks/useAdmin";
import { notFound } from "next/navigation";


export default function MyCoursesPage() {
  const [user, setUser] = useState<{ uid: string } | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [categoryCourses, setCategoryCourses] = useState<Record<string, string[]>>({});
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [activeTab, setActiveTab] = useState<"favorites" | string>("favorites");
  const [loading, setLoading] = useState(true);
  const { isAdmin, loading: pageLoading } = useAdmin();

  useEffect(() => {
    updatePageMeta("My Courses", "View your favorite courses and custom categories");
    fetchCourses().then(setCourses);
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ? { uid: u.uid } : null));
    return () => unsub();
  }, []);

  const loadUserData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const favorites = await getUserFavorites(user.uid);
      setFavoriteIds(favorites.map(f => f.courseId));
      
      const cats = await getUserCategories(user.uid);
      setCategories(cats);
      
      const catCourses: Record<string, string[]> = {};
      for (const cat of cats) {
        catCourses[cat.id] = await getCategoryCourses(cat.id);
      }
      setCategoryCourses(catCourses);
    } catch (e) {
      console.error("Failed to load user data:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadUserData();
  }, [user, loadUserData]);

  const handleCreateCategory = async () => {
    if (!user || !newCategoryName.trim()) return;
    try {
      await createCategory(user.uid, newCategoryName.trim());
      setNewCategoryName("");
      setShowNewCategoryModal(false);
      await loadUserData();
    } catch (e) {
      console.error("Failed to create category:", e);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!user) return;
    if (!confirm("Delete this category?")) return;
    try {
      await deleteCategory(user.uid, categoryId);
      if (activeTab === categoryId) setActiveTab("favorites");
      await loadUserData();
    } catch (e) {
      console.error("Failed to delete category:", e);
    }
  };

  const favoriteCourses = courses.filter(c => favoriteIds.includes(c.id));
  const activeCategory = categories.find(c => c.id === activeTab);
  const activeCategoryCourseIds = activeTab === "favorites" ? favoriteIds : (categoryCourses[activeTab] || []);
  const displayedCourses = activeTab === "favorites" 
    ? favoriteCourses 
    : courses.filter(c => activeCategoryCourseIds.includes(c.id));

  if(pageLoading){
    return <div className="pt-24 px-4 max-w-5xl mx-auto text-gray-700 dark:text-gray-200">Loading...</div>;
  }

  // Return 404-page for non-admin users
  if(!loading && !isAdmin){
    return notFound();
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">My Courses</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Sign in to view your favorite courses and custom categories</p>
          <Link href="/account">
            <Button className="bg-[#990000] hover:bg-[#7f0000] text-white">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">My Courses</h1>
          <Button onClick={() => setShowNewCategoryModal(true)} className="bg-[#990000] hover:bg-[#7f0000] text-white">
            <Plus className="h-4 w-4 mr-2" /> New Category
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => setActiveTab("favorites")}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition cursor-pointer ${
                  activeTab === "favorites"
                    ? "bg-red-50 dark:bg-red-900/20 border-l-4 border-[#990000]"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700 border-l-4 border-transparent"
                }`}
              >
                <Heart className={`h-5 w-5 ${activeTab === "favorites" ? "text-[#990000] fill-current" : "text-gray-400"}`} />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">Favorites</div>
                  <div className="text-xs text-gray-500">{favoriteIds.length} courses</div>
                </div>
              </button>
              
              <div className="border-t border-gray-200 dark:border-gray-700">
                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Categories</div>
                {categories.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-400">No categories yet</div>
                )}
                {categories.map((cat) => (
                  <div key={cat.id} className="group relative">
                    <button
                      onClick={() => setActiveTab(cat.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition cursor-pointer ${
                        activeTab === cat.id
                          ? "bg-gray-50 dark:bg-gray-700 border-l-4 border-gray-400"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700 border-l-4 border-transparent"
                      }`}
                    >
                      <Folder className={`h-5 w-5 hover:text-blue-500 transition-colors ${activeTab === cat.id ? "text-blue-500" : "text-gray-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{cat.name}</div>
                        <div className="text-xs text-gray-500">{(categoryCourses[cat.id] || []).length} courses</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-6">
                {activeTab === "favorites" ? (
                  <Heart className="h-6 w-6 text-[#990000] fill-current" />
                ) : (
                  <Folder className="h-6 w-6 text-gray-600" />
                )}
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {activeTab === "favorites" ? "Favorites" : activeCategory?.name}
                </h2>
              </div>

              {loading ? (
                <div className="text-center py-12 text-gray-600 dark:text-gray-300">Loading...</div>
              ) : displayedCourses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 dark:text-gray-400 mb-2">
                    {activeTab === "favorites"
                      ? "You haven't favorited any courses yet"
                      : "This category is empty"}
                  </div>
                  <Link href="/explore">
                    <Button variant="outline">Explore Courses</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {displayedCourses.map((course) => (
                    <CourseCard key={course.id} course={course} hrefBase="/explore" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showNewCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Category</h3>
              <button onClick={() => setShowNewCategoryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name (e.g., Fall 2025, ML Prerequisites)"
              fullWidth
              className="mb-4"
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowNewCategoryModal(false)}>Cancel</Button>
              <Button 
                onClick={handleCreateCategory} 
                disabled={!newCategoryName.trim()}
                className="bg-[#990000] hover:bg-[#7f0000] text-white"
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
