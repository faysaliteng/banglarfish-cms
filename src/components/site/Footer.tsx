import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Logo } from "./Logo";
import { getMenus } from "@/lib/catalog.functions";
import { Facebook, Instagram, Youtube, Mail, MapPin, Phone } from "lucide-react";

export function Footer() {
  const menusFn = useServerFn(getMenus);
  const { data: menus } = useQuery({ queryKey: ["menus"], queryFn: () => menusFn(), staleTime: 300_000 });
  const footerLinks = menus?.footer ?? [];
  return (
    <footer className="bg-[oklch(0.18_0.02_250)] text-white/85 mt-16">
      <div className="container-x py-14 grid gap-10 sm:grid-cols-2 md:grid-cols-4">
        <div className="min-w-0">
          <div className="mb-4"><Logo variant="dark" className="h-12 w-auto" /></div>
          <p className="text-sm text-white/70 leading-relaxed">
            Bangladesh's freshest fish, delivered from river and sea to your kitchen. Cleaned, iced, and dispatched within hours.
          </p>
          <div className="flex gap-3 mt-5">
            <a aria-label="Facebook" href="#" className="p-2 rounded-full bg-white/10 hover:bg-primary transition"><Facebook className="h-4 w-4" /></a>
            <a aria-label="Instagram" href="#" className="p-2 rounded-full bg-white/10 hover:bg-primary transition"><Instagram className="h-4 w-4" /></a>
            <a aria-label="YouTube" href="#" className="p-2 rounded-full bg-white/10 hover:bg-primary transition"><Youtube className="h-4 w-4" /></a>
          </div>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Shop</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/category/$slug" params={{ slug: "hilsa" }} className="hover:text-primary">Hilsa</Link></li>
            <li><Link to="/category/$slug" params={{ slug: "freshwater" }} className="hover:text-primary">Freshwater</Link></li>
            <li><Link to="/category/$slug" params={{ slug: "prawn-shrimp" }} className="hover:text-primary">Prawn & Shrimp</Link></li>
            <li><Link to="/category/$slug" params={{ slug: "dried-fish" }} className="hover:text-primary">Dried Fish</Link></li>
            <li><Link to="/shop" className="hover:text-primary">All Products</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Help</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/pages/$slug" params={{ slug: "about" }} className="hover:text-primary">About Us</Link></li>
            <li><Link to="/pages/$slug" params={{ slug: "shipping" }} className="hover:text-primary">Shipping & Delivery</Link></li>
            <li><Link to="/pages/$slug" params={{ slug: "returns" }} className="hover:text-primary">Returns</Link></li>
            <li><Link to="/pages/$slug" params={{ slug: "faq" }} className="hover:text-primary">FAQ</Link></li>
            <li><Link to="/pages/$slug" params={{ slug: "contact" }} className="hover:text-primary">Contact</Link></li>
            <li><Link to="/blog" className="hover:text-primary">Blog</Link></li>
            {footerLinks.map((l, i) => (
              <li key={i}><a href={l.href} className="hover:text-primary">{l.label}</a></li>
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          <h4 className="text-white font-semibold mb-4">Contact</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /> <span className="break-words min-w-0">House 12, Road 5, Dhanmondi, Dhaka 1205</span></li>
            <li className="flex gap-2"><Phone className="h-4 w-4 mt-0.5 shrink-0" /> <span className="break-words min-w-0">+880 1000-000000</span></li>
            <li className="flex gap-2"><Mail className="h-4 w-4 mt-0.5 shrink-0" /> <span className="break-all min-w-0">hello@banglarfish.com</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/60">
          <p>© {new Date().getFullYear()} Banglarfish. All rights reserved.</p>
          <div className="flex gap-5">
            <Link to="/pages/$slug" params={{ slug: "privacy" }} className="hover:text-white">Privacy</Link>
            <Link to="/pages/$slug" params={{ slug: "terms" }} className="hover:text-white">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
