'use client'

import React, { useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardMedia } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { incrementBlogRead } from '@/lib/firestore/analytics';
import Tag from '@/components/ui/Tag';
import { useApp } from '@/contexts/AppContext';

import campus from '@/public/images/campus.png';

const BlogDetailPage: React.FC = () => {
  const params = useParams();
  const blogId = params.id as string;
  const { state } = useApp();

  // Increment unique blog read on mount 
  useEffect(() => {
    if (blogId) {
      incrementBlogRead(blogId).catch(() => {});
    }
  }, [blogId]);

  if (state.blogPosts.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 pt-24 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  const blogPost = state.blogPosts.find(post => post.id === blogId);

  if (!blogPost) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pt-24 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link href="/blog">
          <Button variant="outline" className="mb-8" icon={ArrowLeft}>
            Back to Newsletter
          </Button>
        </Link>

        {/* Blog Post Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {blogPost.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-300 mb-6">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{blogPost.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(blogPost.date), 'MMMM dd, yyyy')}</span>
            </div>
          </div>

          {/* Tags */}
          {blogPost.tags && blogPost.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {blogPost.tags.map((tag, index) => (
                <Tag key={index} variant="red" size="md">{tag}</Tag>
              ))}
            </div>
          )}

          {/* Excerpt */}
          <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            {blogPost.excerpt}
          </p>
        </div>

        {/* Featured Image */}
        {blogPost.image && (
          <div className="mb-8">
            <Image
              src={blogPost.image || campus}
              alt={blogPost.title}
              width={800}
              height={400}
              className="w-full h-64 sm:h-80 md:h-96 object-cover rounded-lg shadow-lg"
            />
          </div>
        )}

        {/* Blog Content */}
        <Card className="h-full dark:bg-gray-800 pt-4">
          <CardContent className="p-8">
            <div 
              className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300"
              dangerouslySetInnerHTML={{ __html: blogPost.content }}
            />
          </CardContent>
        </Card>

        {/* Related Posts */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Related Posts
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {state.blogPosts
              .filter(post => post.id !== blogId && post.published)
              .slice(0, 2)
              .map((post) => (
                <Card key={post.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    {post.image && (
                      <CardMedia
                        src={post.image}
                        alt={post.title}
                        fill
                        className="h-32 rounded-lg mb-4"
                      />
                    )}
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {post.title}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                      {post.excerpt}
                    </p>
                    <Link href={`/blog/${post.id}`}>
                      <Button variant="outline" size="sm">
                        Read More
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogDetailPage;
