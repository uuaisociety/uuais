"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, MessageSquareCode, ArrowUp, Handshake } from "lucide-react";
import { Linkedin01Icon, InstagramIcon } from "hugeicons-react";
// import { SiInstagram } from '@icons-pack/react-simple-icons';
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input_old";

export const Footer: React.FC = () => {
  const [email, setEmail] = useState("");
  //   const [loading, setLoading] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("Newsletter subscription:", email);
    setEmail("");
    // setLoading(false);
    alert("Thank you for subscribing to our newsletter!");
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-gray-800 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 text-white transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand and Description */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg">
                <div className="pl-2 pb-2 rounded-lg">
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
                </div>
              </div>
            </div>
            <p className="text-gray-300 text-sm">
              Connecting students passionate about Artificial Intelligence. Join
              us in exploring the future of technology through hands-on learning
              and innovation.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://linkedin.com/company/uu-ai-society"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Linkedin01Icon className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com/uuaisociety"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/events"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Events
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Newsletter
                </Link>
              </li>
              {/* <li><Link href="/join" className="text-gray-300 hover:text-white transition-colors">Join Us</Link></li> */}
              <li>
                <Link
                  href="/contact"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
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
              {/* <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <span className="text-gray-300 text-sm">
                  Computer Science Building<br />
                  University Campus<br />
                  City, State 12345
                </span>
              </div> */}
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Newsletter</h3>
            <p className="text-gray-300 text-sm mb-4">
              Stay updated with our latest events and AI insights.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              />
              <Button
                type="submit"
                variant="default"
                size="sm"
                className="cursor-pointer p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-color sw-full text-white"
                fullWidth
                // loading={loading}
              >
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        {/* Partners strip */}
        <div className="py-8 border-t border-gray-900">
          <h3 className="text-center text-lg font-semibold mb-6 text-gray-100">
            Our partners
          </h3>
          <div className="grid grid-cols-2 [@media(max-width:350px)]:grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6  gap-6 items-center">
            {/* Fill out grid */}
            {Array.from({ length: 0 }).map((_, idx) => (
              <div
                key={idx}
                className="flex items-center justify-center rounded-lg border border-gray-800 dark:border-gray-900 p-4 h-24"
              >
                <div className="w-full h-full bg-gray-800 dark:bg-gray-900 rounded-lg"></div>
              </div>
            ))}
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
                {/* relative flex items-center justify-center bg-gray-300 rounded-lg border border-gray-800 p-6 h-24 */}

                <div className="relative w-full h-full flex items-center justify-center">
                  <Image
                    src={p.src}
                    alt={p.alt}
                    loading="lazy"
                    objectFit="contain"
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
            {/* <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
              Terms of Service
            </Link> */}
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
