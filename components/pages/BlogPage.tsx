'use client'

// Disable static generation for this page
export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, User, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { useApp } from '@/contexts/AppContext';
import { updatePageMeta } from '@/utils/seo';
import { format } from 'date-fns';
import Image from 'next/image';

const BlogPage: React.FC = () => {
  const { state } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    updatePageMeta('Blog', 'Read the latest articles and insights from UU AI Society members and industry experts');
  }, []);

  const filteredPosts = state.blogPosts
    .filter(post => post.published)
    .filter(post => {
      const searchLower = searchTerm.toLowerCase();
      return post.title.toLowerCase().includes(searchLower) ||
             post.excerpt.toLowerCase().includes(searchLower) ||
             post.tags.some(tag => tag.toLowerCase().includes(searchLower));
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const featuredPost = filteredPosts[0];
  const otherPosts = filteredPosts.slice(1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Blog
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Insights, tutorials, and thoughts from our community of AI enthusiasts
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-12">
          <Input
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            startIcon={Search}
            fullWidth
          />
        </div>

        {filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No articles found
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {searchTerm 
                ? 'No articles match your search criteria.'
                : 'We\'re working on creating amazing content for you!'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Featured Post */}
            {featuredPost && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Featured Article</h2>
                <Card className="overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <div className="md:flex">
                    <div className="md:w-1/2">
                    <Link href={`/blog/${featuredPost.id}`}>
                      <Image
                        src={featuredPost.image}
                        alt={featuredPost.title}
                        width={500}
                        height={500}
                        className="w-full h-64 md:h-full object-cover"
                      />
                    </Link>
                    </div>
                    <div className="md:w-1/2 p-8">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {featuredPost.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 text-sm font-medium rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        <Link href={`/blog/${featuredPost.id}`} className="hover:text-red-600 dark:hover:text-red-400 transition-colors">
                          {featuredPost.title}
                        </Link>
                      </h3>
                      
                      <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                        {featuredPost.excerpt}
                      </p>
                      
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          <span>{featuredPost.author}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>{format(new Date(featuredPost.date), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Other Posts */}
            {otherPosts.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Latest Articles</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {otherPosts.map((post) => (
                    <Card key={post.id} className="h-full hover:shadow-2xl hover:scale-105 transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <div className="aspect-video relative overflow-hidden rounded-t-lg">
                        <Image
                          src={post.image}
                          alt={post.title}
                          width={100}
                          height={100}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <CardContent className="p-6">
                        <div className="flex flex-wrap gap-1 mb-3">
                          {post.tags.slice(0, 2).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          <Link 
                            href={`/blog/${post.id}`} 
                            className="hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          >
                            {post.title}
                          </Link>
                        </h3>
                        
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
                          {post.excerpt}
                        </p>
                        
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-3">
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            <span>{post.author}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>{format(new Date(post.date), 'MMM d')}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CTA Section */}
        {/* <div className="mt-16 bg-gradient-to-r from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Want to Contribute?
          </h2>
          <p className="text-red-100 mb-6 max-w-2xl mx-auto">
            Share your AI knowledge and insights with our community. 
            We&apos;re always looking for quality content from our members.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 bg-white text-red-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Submit an Article
            </Link>
            <Link
              href="/join"
              className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white font-medium rounded-lg hover:bg-white hover:text-red-600 transition-colors"
            >
              Join Our Community
            </Link>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default BlogPage;