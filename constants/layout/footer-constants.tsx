import {
  Twitter,
  Instagram,
  Linkedin,
  Github,
  LucideIcon,
} from "lucide-react";

export interface SocialLink {
  href: string;
  icon: LucideIcon;
  label: string;
}

export interface FooterLink {
  href: string;
  label: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export interface ContactInfo {
  address: {
    line1: string;
    line2: string;
    line3: string;
  };
  email: string;
  phone: string;
}

export interface FooterConfig {
  companyName: {
    primary: string;
    secondary: string;
  };
  tagline: string;
  socialLinks: SocialLink[];
  sections: FooterSection[];
  contactInfo: ContactInfo;
  legal: {
    copyrightText: string;
    links: FooterLink[];
  };
}

export const footerConfig: FooterConfig = {
  companyName: {
    primary: "Bizd",
    secondary: "han",
  },
  tagline:
    "Track personal spending, manage investments, and run SME billing — all in one unified platform.",
  socialLinks: [
    { href: "https://twitter.com", icon: Twitter, label: "Twitter" },
    { href: "https://instagram.com", icon: Instagram, label: "Instagram" },
    { href: "https://linkedin.com", icon: Linkedin, label: "LinkedIn" },
    { href: "https://github.com", icon: Github, label: "GitHub" },
  ],
  sections: [
    {
      title: "Product",
      links: [
        { href: "/#features", label: "Features" },
        { href: "/signup", label: "Get started" },
        { href: "/#faq", label: "FAQ" },
      ],
    },
    {
      title: "Resources",
      links: [
        { href: "/#testimonials", label: "Testimonials" },
        { href: "/login", label: "Sign in" },
      ],
    },
  ],
  contactInfo: {
    address: {
      line1: "SVNIT",
      line2: "Surat, Gujarat, India",
      line3: "",
    },
    email: "contact@bizdhan.com",
    phone: "+91 12345 67890",
  },
  legal: {
    copyrightText: "Bizdhan. All rights reserved.",
    links: [
      { href: "#", label: "Privacy Policy" },
      { href: "#", label: "Terms of Service" },
    ],
  },
};
