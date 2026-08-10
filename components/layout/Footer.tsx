"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, MessageSquareCode, ArrowUp, Handshake } from "lucide-react";
import { HugeiconsIcon } from '@hugeicons/react';
import { LinkedinIcon, InstagramIcon } from '@hugeicons/core-free-icons';
import { Button } from "@/components/ui/Button";

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-gray-800 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 text-white transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Brand and Description */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Image
                src="/images/logo-highdef.png"
                alt="UU AI Society Logo"
                width={240}
                height={40}
                className="mb-1 h-12 w-auto"
                priority
              />
              <span className="font-bold text-xl text-gray-100 dark:text-white">
                UU AI Society
              </span>
            </div>
            <p className="text-gray-300 text-sm">
              Connecting students passionate about Artificial Intelligence. Join
              us in exploring the future of technology through hands-on learning
              and innovation.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://linkedin.com/company/uu-ai-society"
                aria-label="LinkedIn"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <HugeiconsIcon icon={LinkedinIcon} className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com/uuaisociety"
                aria-label="Instagram"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <HugeiconsIcon icon={InstagramIcon} className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
            <ul className="space-y-2">
              <li><Link href="/" prefetch className="text-gray-300 hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/events" prefetch className="text-gray-300 hover:text-white transition-colors">Events</Link></li>
              <li><Link href="/careers" prefetch className="text-gray-300 hover:text-white transition-colors">Job board</Link></li>
              <li><Link href="/about" prefetch className="text-gray-300 hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact" prefetch className="text-gray-300 hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Contact</h2>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-300 text-sm">
                  <a href="mailto:contact@uuais.com">contact@uuais.com</a>
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <MessageSquareCode className="h-4 w-4 text-gray-400" />
                <span className="text-gray-300 text-sm">
                  <a href="mailto:dev@uuais.com">dev@uuais.com</a>
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Handshake className="h-4 w-4 text-gray-400" />
                <span className="text-gray-300 text-sm">
                  <a href="mailto:partnerships@uuais.com">
                    partnerships@uuais.com
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Partners strip */}
        <div className="py-8 border-t border-gray-900">
          <h2 className="text-center text-lg font-semibold mb-6 text-gray-100">
            Our partners
          </h2>
          <div className="grid grid-cols-2 [@media(max-width:350px)]:grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6  gap-6 items-center">
            {[
              {
                src: "/images/partners/Uppsala_kommun_Logo_Bl_Yellow_RGB.png",
                alt: "Uppsala Kommun",
                link: "https://www.uppsala.se/",
              },
              {
                src: "/images/partners/thalamind_logo.png",
                alt: "Thalamind",
                link: "https://www.thalamind.com/",
              },
              {
                src: "/images/partners/vantel_logo.png",
                alt: "Vantel logo",
                link: "https://www.vantel.com/",
              },
              {
                src: "/images/partners/voi_logo.png",
                alt: "Voi logo",
                link: "https://www.voi.com/",
              },
              {
                src: "/images/partners/arkyv-black.svg",
                alt: "Arkyv",
                link: "https://www.arkyv.ai/",
              },
              {
                src: "/images/partners/fyris-logga.svg",
                alt: "Fyris",
                link: "https://www.fyris.ai/",
              },
            ].map((p) => (
              <a
                key={p.alt}
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex items-center justify-center bg-gray-300 rounded-lg border border-gray-800 h-24 hover:bg-gray-200 transition-colors"
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  <Image
                    src={p.src}
                    alt={p.alt}
                    loading="lazy"
                    width={190}
                    height={80}
                    className="object-contain max-h-[80px] md:max-h-[100px] p-2 opacity-80 hover:opacity-100 transition-opacity"
                  />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} UU AI Society (Org number:
            802551-8930). All rights reserved.
          </p>
          <div className="flex items-center space-x-6">
            <Link
              href="/privacy"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Privacy Policy
            </Link>
            <Button
              onClick={scrollToTop}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-white"
              aria-label="Scroll to top"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
};
