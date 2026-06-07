import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../api/products';
import { blogApi } from '../api/blogs';
import {
  FiShoppingCart, FiStar, FiChevronRight, FiSearch, FiPackage,
  FiTruck, FiShield, FiRefreshCw, FiFeather, FiHeart,
  FiChevronLeft, FiClock,
  FiCheckCircle, FiUsers, FiBookOpen, FiCalendar, FiDroplet,
  FiSun,
} from 'react-icons/fi';
import { IoLeaf } from 'react-icons/io5';

/* ===================================================================
   Constants
   =================================================================== */

const HERO_SLIDES = [
  {
    tag: 'Ancient Wisdom, Modern Care',
    title: 'Ayurvedic Healing',
    subtitle: 'Naturally Restore Balance',
    desc: 'Discover the power of traditional Ayurvedic remedies combined with modern medical expertise. Your journey to holistic wellness starts here.',
    image: 'https://myriyansh.com/site/images/7.jpg',
    accent: '#059669',
  },
  {
    tag: 'Pure & Potent Herbs',
    title: "Nature's",
    subtitle: '100% Natural Ingredients',
    desc: 'From Ashwagandha to Turmeric, we bring you the finest selection of authentic herbal supplements, certified and lab-tested for purity.',
    image: 'https://myriyansh.com/site/images/2.jpg',
    accent: '#d97706',
  },
  {
    tag: 'Holistic Wellness',
    title: 'Mind — Body — Spirit',
    subtitle: 'Complete Health Solutions',
    desc: 'Explore our curated range of wellness products — from immunity boosters to daily nutrition — designed to nurture every aspect of your health.',
    image: 'https://myriyansh.com/site/images/1.jpg',
    accent: '#e11d48',
  },
  {
    tag: 'Expert Care, 24/7',
    title: 'Your Health Partner',
    subtitle: 'Always Here For You',
    desc: 'Quality products, expert advice, and fast delivery. A complete healthcare experience — online and in-store.',
    image: 'https://myriyansh.com/site/images/7.jpg',
    accent: '#0284c7',
  },
];

const FAQ_DATA = [
  { q: 'How do I place an order online?', a: 'Simply browse our product catalog, add items to cart, and proceed to checkout.' },
  { q: 'What payment methods are accepted?', a: 'We accept Cash, UPI, Card, Credit, and Company billing.' },
  
];

const TESTIMONIALS = [
  { name: 'Dr. Sharma', role: 'Physician', text: 'Prandhara has transformed how I manage my clinic\'s  The POS system is incredibly efficient.', rating: 5 },
  { name: 'Rajesh Patel', role: 'Medical Store Owner', text: 'Best ERP solution for medical stores. Inventory management and alerts are game-changers.', rating: 5 },
  { name: 'Priya Singh', role: 'Customer', text: 'Ordering riyansh products online is so convenient. Fast delivery and genuine products always!', rating: 5 },
  { name: 'Anita Verma', role: 'Wellness Coach', text: 'The Ayurvedic collection is outstanding. My clients love the quality and authenticity.', rating: 5 },
  { name: 'Dr. Krishnan', role: 'Ayurvedic Practitioner', text: 'Finally, a platform that bridges traditional Ayurveda with modern healthcare delivery. Brilliant!', rating: 5 },
];

const TRUST_BADGES = [
  { label: 'ISO 9001 Certified', icon: FiCheckCircle },
  { label: 'GMP Compliant', icon: FiShield },
  { label: '50,000+ Customers', icon: FiUsers },
  { label: '30-Day Returns', icon: FiRefreshCw },
];

/* ===================================================================
   Ayurvedic Benefit Cards Data
   =================================================================== */

const AYURVEDIC_BENEFITS = [
  {
    icon: IoLeaf,
    title: '100% Natural',
    desc: 'Pure herbal extracts from organically farmed ingredients. No artificial additives, preservatives, or fillers.',
    color: 'emerald',
    bgGlow: 'rgba(16,185,129,0.12)',
  },
  {
    icon: FiDroplet,
    title: 'No Chemicals',
    desc: 'Zero chemical processing. Cold-pressed and sun-dried using traditional Ayurvedic methods passed down through generations.',
    color: 'blue',
    bgGlow: 'rgba(59,130,246,0.12)',
  },
  {
    icon: FiShield,
    title: 'Immunity Booster',
    desc: 'Fortified with potent herbs like Tulsi, Giloy, and Ashwagandha to naturally strengthen your immune system.',
    color: 'amber',
    bgGlow: 'rgba(245,158,11,0.12)',
  },

];

/* ===================================================================
   Floating Herbs Data
   =================================================================== */

const FLOATING_HERBS = [
  { name: 'Turmeric', emoji: '🟡', x: '10%', y: '20%', delay: 0, size: 'text-sm' },
  { name: 'Tulsi', emoji: '🌿', x: '85%', y: '15%', delay: 1, size: 'text-base' },
  { name: 'Amla', emoji: '🟢', x: '15%', y: '70%', delay: 2, size: 'text-sm' },
  { name: 'Neem', emoji: '🌱', x: '75%', y: '75%', delay: 0.5, size: 'text-base' },
  { name: 'Ginger', emoji: '🫚', x: '5%', y: '45%', delay: 1.5, size: 'text-sm' },
  { name: 'Aloe Vera', emoji: '🌵', x: '90%', y: '50%', delay: 2.5, size: 'text-sm' },
];

/* ===================================================================
   Custom Hooks
   =================================================================== */

function useScrollReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setRevealed(true); o.unobserve(el); } }, { threshold });
    o.observe(el);
    return () => o.disconnect();
  }, [threshold]);
  return [ref, revealed];
}

function useCountUp(end, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf, t0 = null;
    const n = parseInt(String(end).replace(/[^0-9]/g, ''), 10) || 0;
    const step = (ts) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * n));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, start]);
  return count;
}

function useAutoSlide(length, interval = 5000) {
  const [active, setActive] = useState(0);
  const next = useCallback(() => setActive((p) => (p + 1) % length), [length]);
  const prev = useCallback(() => setActive((p) => (p - 1 + length) % length), [length]);
  const goTo = useCallback((i) => setActive(i), []);
  useEffect(() => { const t = setInterval(next, interval); return () => clearInterval(t); }, [next, interval]);
  return { active, next, prev, goTo };
}

/* useScrollParallax & useParallax removed — JS-driven parallax caused jank. CSS-only transforms used instead. */

/* ===================================================================
   Sub-components
   =================================================================== */

const AnimatedCounter = ({ value, suffix = '', isVisible }) => {
  const count = useCountUp(value, 2000, isVisible);
  return <>{count}{isVisible && suffix}</>;
};

const ProductCard = memo(({ product }) => (
  <Link to={`/shop?product=${product._id}`} className="group block">
    <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-gray-50">
      {product.images?.[0] ? (
        <img src={product.images[0]} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><FiPackage className="w-12 h-12 text-gray-200" /></div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {product.sellingPrice < product.mrp && (
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
          {Math.round((1 - product.sellingPrice / product.mrp) * 100)}% OFF
        </span>
      )}
      {product.stockQuantity <= 0 && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
          <span className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-medium">Out of Stock</span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
        <button className="w-full rounded-xl bg-white/90 backdrop-blur-sm text-gray-900 py-2.5 text-sm font-semibold shadow-lg hover:bg-white transition-colors flex items-center justify-center gap-2">
          <FiShoppingCart className="w-4 h-4" /> Quick View
        </button>
      </div>
    </div>
    <div className="mt-3 px-1">
      <p className="text-xs text-gray-400 mb-0.5">{product.category?.name || 'Medicine'}</p>
      <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1 group-hover:text-emerald-600 transition-colors">{product.name}</h3>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-lg font-bold text-emerald-600">₹{product.sellingPrice}</span>
        {product.mrp > product.sellingPrice && <span className="text-sm text-gray-400 line-through">₹{product.mrp}</span>}
      </div>
    </div>
  </Link>
));


/* ===================================================================
   Inline SVG Leaf Icon — optimized as a pure function
   =================================================================== */

const LeafSVG = memo(({ className, color = '#059669', size = 24, style = {} }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    style={style}
  >
    <path
      d="M12 2C12 2 6 6 6 12C6 18 12 22 12 22C12 22 18 18 18 12C18 6 12 2 12 2Z"
      fill={color}
      opacity="0.6"
    />
    <path
      d="M12 6C12 6 9 8.5 9 12C9 15.5 12 18 12 18C12 18 15 15.5 15 12C15 8.5 12 6 12 6Z"
      fill={color}
      opacity="0.3"
    />
  </svg>
));

/* ===================================================================
   Scroll Indicator
   =================================================================== */

const ScrollIndicator = () => (
  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
    <span className="text-white/40 text-xs tracking-widest uppercase font-light">Scroll</span>
    <div className="relative flex items-center justify-center">
      <div className="w-6 h-10 rounded-full border-2 border-white/20 animate-scroll-indicator-ring" />
      <div className="absolute top-2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-scroll-indicator" />
    </div>
  </div>
);

/* ===================================================================
   Floating Herb Label
   =================================================================== */

const FloatingHerbLabel = memo(({ herb, index }) => {
  const animClass = index % 3 === 0 ? 'animate-float-leaf-1' : index % 3 === 1 ? 'animate-float-leaf-2' : 'animate-float-leaf-3';
  const delay = herb.delay || Math.random() * 3;
  const sizeClass = herb.size || 'text-xs';

  return (
    <div
      className={`absolute pointer-events-none select-none ${animClass} ${sizeClass}`}
      style={{
        left: herb.x,
        top: herb.y,
        animationDelay: `${delay}s`,
      }}
    >
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 font-medium">
        <span className="text-lg leading-none">{herb.emoji}</span>
        <span>{herb.name}</span>
      </span>
    </div>
  );
});

/* ===================================================================
   Juice Bottle Showcase
   =================================================================== */

const JuiceBottleShowcase = memo(() => {
  const herbalIngredients = [
    { name: 'Turmeric', emoji: '🟡', angle: 0 },
    { name: 'Tulsi', emoji: '🌿', angle: 60 },
    { name: 'Amla', emoji: '🟢', angle: 120 },
    { name: 'Neem', emoji: '🌱', angle: 180 },
    { name: 'Ginger', emoji: '🫚', angle: 240 },
    { name: 'Aloe Vera', emoji: '🌵', angle: 300 },
  ];

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Light glow behind bottle */}
      <div className="absolute inset-0 rounded-full animate-light-glow pointer-events-none" />

      {/* Steam effects */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 pointer-events-none">
        <div className="w-full h-full rounded-full bg-gradient-to-t from-emerald-400/10 to-transparent animate-steam-glow blur-xl" />
        <div className="absolute -top-4 left-4 w-12 h-12 rounded-full bg-amber-400/10 animate-steam-glow-2 blur-lg" style={{ animationDelay: '1s' }} />
      </div>

      {/* Rotating outer ring */}
      <div className="absolute inset-0 flex items-center justify-center animate-orbit pointer-events-none">
        {herbalIngredients.map((ing, i) => {
          const rad = (ing.angle * Math.PI) / 180;
          const r = 100;
          const x = Math.cos(rad) * r;
          const y = Math.sin(rad) * r;
          return (
            <div
              key={i}
              className="absolute flex items-center gap-1.5"
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              <span className="text-lg">{ing.emoji}</span>
              <span className="text-[10px] text-white/70 font-medium whitespace-nowrap bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10">
                {ing.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Reverse rotating inner ring */}
      <div className="absolute inset-0 flex items-center justify-center animate-orbit-reverse pointer-events-none">
        {herbalIngredients.slice(0, 4).map((ing, i) => {
          const rad = ((ing.angle + 30) * Math.PI) / 180;
          const r = 55;
          const x = Math.cos(rad) * r;
          const y = Math.sin(rad) * r;
          return (
            <div
              key={i}
              className="absolute"
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
            </div>
          );
        })}
      </div>

      {/* Bottle SVG */}
      <div className="relative z-10 flex items-center justify-center py-12 animate-bottle-float">
        <svg viewBox="0 0 120 280" className="w-32 sm:w-36 md:w-40 drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Bottle body */}
          <defs>
            <linearGradient id="bottleGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="40%" stopColor="#10b981" />
              <stop offset="70%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="bottleShine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="30%" stopColor="rgba(255,255,255,0.35)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <linearGradient id="labelGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>

          {/* Bottle neck */}
          <rect x="48" y="20" width="24" height="25" rx="3" fill="url(#bottleGrad)" opacity="0.8" />
          {/* Bottle cap */}
          <rect x="45" y="8" width="30" height="14" rx="4" fill="#92400e" />
          <rect x="45" y="12" width="30" height="3" fill="#a16207" />
          {/* Bottle shoulder */}
          <path d="M48 45 L35 60 L35 75 L85 75 L85 60 L72 45 Z" fill="url(#bottleGrad)" />
          {/* Bottle body */}
          <rect x="32" y="75" width="56" height="155" rx="12" fill="url(#bottleGrad)" />
          {/* Bottle bottom */}
          <path d="M32 215 Q32 230 44 230 L76 230 Q88 230 88 215 Z" fill="#047857" />

          {/* Liquid fill */}
          <rect x="36" y="100" width="48" height="110" rx="8" fill="rgba(5,150,105,0.3)" />
          <rect x="36" y="100" width="48" height="10" rx="4" fill="rgba(255,255,255,0.1)" />

          {/* Label */}
          <rect x="38" y="130" width="44" height="60" rx="4" fill="url(#labelGrad)" />
          <rect x="42" y="134" width="36" height="52" rx="3" fill="#fef3c7" />
          {/* Leaf on label */}
          <path d="M58 148 Q52 142 56 138 Q62 134 66 140 Q70 146 64 150 Q60 154 58 148 Z" fill="#059669" />
          <text x="60" y="168" textAnchor="middle" fill="#92400e" fontSize="7" fontWeight="bold" className="animate-label-pulse">Riyansh</text>
          <text x="60" y="177" textAnchor="middle" fill="#92400e" fontSize="5.5" fontWeight="500" className="animate-label-pulse" style={{ animationDelay: '0.15s' }}>Amrit Juice</text>

          {/* Shine overlay */}
          <rect x="32" y="75" width="56" height="155" rx="12" fill="url(#bottleShine)" />
          <rect x="35" y="80" width="8" height="140" rx="4" fill="rgba(255,255,255,0.12)" />
        </svg>
      </div>

      {/* Floating herb labels around bottle area */}
      <div className="absolute inset-0 pointer-events-none">
        <FloatingHerbLabel herb={{ name: 'Turmeric', emoji: '🟡', x: '5%', y: '25%', delay: 0 }} index={0} />
        <FloatingHerbLabel herb={{ name: 'Tulsi', emoji: '🌿', x: '80%', y: '20%', delay: 1 }} index={1} />
        <FloatingHerbLabel herb={{ name: 'Amla', emoji: '🟢', x: '8%', y: '65%', delay: 2 }} index={2} />
        <FloatingHerbLabel herb={{ name: 'Neem', emoji: '🌱', x: '78%', y: '60%', delay: 0.5 }} index={0} />
        <FloatingHerbLabel herb={{ name: 'Ginger', emoji: '🫚', x: '45%', y: '5%', delay: 1.5 }} index={1} />
      </div>
    </div>
  );
});

/* ===================================================================
   Benefit Card Component
   =================================================================== */

const BenefitCard = memo(({ benefit, index, isVisible }) => {
  const [isHovered, setIsHovered] = useState(false);
  const colorMap = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100', borderHover: 'hover:border-emerald-300', iconBg: 'bg-emerald-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100', borderHover: 'hover:border-blue-300', iconBg: 'bg-blue-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100', borderHover: 'hover:border-amber-300', iconBg: 'bg-amber-100' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-100', borderHover: 'hover:border-violet-300', iconBg: 'bg-violet-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', ring: 'ring-green-100', borderHover: 'hover:border-green-300', iconBg: 'bg-green-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-100', borderHover: 'hover:border-rose-300', iconBg: 'bg-rose-100' },
  };
  const c = colorMap[benefit.color] || colorMap.emerald;

  return (
    <div
      className={`group relative bg-white rounded-2xl p-7 sm:p-8 border border-gray-100 transition-all duration-500 ${c.borderHover} ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{
        transitionDelay: `${index * 100}ms`,
        transitionProperty: 'opacity, transform, box-shadow, border-color',
        transitionDuration: '0.6s',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hover glow background */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${benefit.bgGlow || 'rgba(16,185,129,0.08)'}, transparent 70%)`,
        }}
      />

      {/* Decorative leaf top-right */}
      <div
        className={`absolute top-2 right-2 w-8 h-8 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none ${
          isHovered ? 'animate-leaf-wave' : ''
        }`}
      >
        <LeafSVG color={benefit.color === 'emerald' ? '#059669' : benefit.color === 'blue' ? '#3b82f6' : '#059669'} size={28} />
      </div>

      {/* Icon */}
      <div className={`relative z-10 w-14 h-14 rounded-xl ${c.bg} ${c.text} flex items-center justify-center mb-5 transition-all duration-500 group-hover:scale-110 group-hover:${c.iconBg} ${
        isHovered ? 'animate-icon-morph' : ''
      }`}>
        <benefit.icon className="w-7 h-7" />
      </div>

      {/* Content */}
      <h3 className="relative z-10 text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-900 transition-colors">
        {benefit.title}
      </h3>
      <p className="relative z-10 text-gray-500 text-sm leading-relaxed">
        {benefit.desc}
      </p>

      {/* Bottom accent line */}
      <div
        className={`absolute bottom-0 left-6 right-6 h-0.5 rounded-full transition-all duration-500 scale-x-0 group-hover:scale-x-100`}
        style={{
          background: `linear-gradient(90deg, ${benefit.color === 'emerald' ? '#059669' : benefit.color === 'blue' ? '#3b82f6' : benefit.color === 'amber' ? '#d97706' : benefit.color === 'violet' ? '#7c3aed' : benefit.color === 'green' ? '#16a34a' : '#e11d48'}, transparent)`,
        }}
      />
    </div>
  );
});

/* ===================================================================
   Main Home Component
   =================================================================== */

const Home = () => {
  const [bestSellers, setBestSellers] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [blogIdx, setBlogIdx] = useState(0);
  const [visibleCards, setVisibleCards] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
    return w >= 1024 ? 3 : w >= 640 ? 2 : 1;
  });
  const [search, setSearch] = useState('');
  const [faqOpen, setFaqOpen] = useState(null);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [sellerIdx, setSellerIdx] = useState(0);
  const [visibleSellerCards, setVisibleSellerCards] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
    return w >= 1280 ? 5 : w >= 1024 ? 4 : w >= 640 ? 3 : 2;
  });

  const slider = useAutoSlide(HERO_SLIDES.length, 6000);
  const slide = HERO_SLIDES[slider.active];

  const [exitingIdx, setExitingIdx] = useState(null);
  const prevRef = useRef(slider.active);
  useEffect(() => {
    const p = prevRef.current;
    if (p !== slider.active) {
      prevRef.current = slider.active;
      setExitingIdx(p);
      const t = setTimeout(() => setExitingIdx(null), 700);
      return () => clearTimeout(t);
    }
  }, [slider.active]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [sellersResult, blogsResult] = await Promise.allSettled([
      productApi.getBestSelling(),
      blogApi.getAll({ limit: 9 }),
    ]);
    if (sellersResult.status === 'fulfilled') {
      setBestSellers(sellersResult.value.products);
    }
    if (blogsResult.status === 'fulfilled') {
      setBlogs(blogsResult.value.blogs || []);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    window.location.href = `/shop?search=${encodeURIComponent(search.trim())}`;
  };

  // Testimonial auto-rotate
  useEffect(() => {
    if (TESTIMONIALS.length <= 1) return;
    const t = setInterval(() => setTestimonialIdx((p) => (p + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Track visible card count for carousel
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1024) setVisibleCards(3);
      else if (w >= 640) setVisibleCards(2);
      else setVisibleCards(1);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const maxBlogIdx = Math.max(0, blogs.length - visibleCards);

  // Blog carousel auto-rotate
  useEffect(() => {
    if (blogs.length <= 1) return;
    const t = setInterval(() => setBlogIdx((p) => (p + 1) % Math.max(1, maxBlogIdx + 1)), 5000);
    return () => clearInterval(t);
  }, [maxBlogIdx, blogs.length]);

  // Best Seller auto-rotate
  const maxSellerIdx = Math.max(0, bestSellers.length - visibleSellerCards);
  useEffect(() => {
    if (bestSellers.length <= 1) return;
    const t = setInterval(() => setSellerIdx((p) => (p + 1) % Math.max(1, maxSellerIdx + 1)), 5000);
    return () => clearInterval(t);
  }, [maxSellerIdx, bestSellers.length]);

  // Track visible seller card count for carousel
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1280) setVisibleSellerCards(5);
      else if (w >= 1024) setVisibleSellerCards(4);
      else if (w >= 640) setVisibleSellerCards(3);
      else setVisibleSellerCards(2);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ======== Scroll Reveal for Ayurvedic Benefits ========
  const benefitsRef = useRef(null);
  const [benefitsVisible, setBenefitsVisible] = useState(false);
  useEffect(() => {
    const el = benefitsRef.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setBenefitsVisible(true); o.unobserve(el); } }, { threshold: 0.1 });
    o.observe(el);
    return () => o.disconnect();
  }, []);

  // ======== Stats visibility for About Company ========
  const aboutStatsRef = useRef(null);
  const [aboutStatsVisible, setAboutStatsVisible] = useState(false);
  useEffect(() => {
    const el = aboutStatsRef.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setAboutStatsVisible(true); o.unobserve(el); } }, { threshold: 0.3 });
    o.observe(el);
    return () => o.disconnect();
  }, []);

  // ======== About Company Scroll Reveal ========
  const aboutRef = useRef(null);
  const [aboutVisible, setAboutVisible] = useState(false);
  useEffect(() => {
    const el = aboutRef.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setAboutVisible(true); o.unobserve(el); } }, { threshold: 0.1 });
    o.observe(el);
    return () => o.disconnect();
  }, []);

  // ======== Parallax for hero ========
  // Mouse parallax removed — CSS-only for performance
  const heroParallaxRef = useRef(null);
  const heroParallaxOffset = { x: 0, y: 0 };

  // ======== Scroll Parallax Refs ========
  // Scroll parallax refs removed — using CSS transforms for performance

  // ======== Hero entrance state (re-triggers on slide change) ========
  const [heroEntranceKey, setHeroEntranceKey] = useState(0);
  const prevSlideRef = useRef(slider.active);
  useEffect(() => {
    if (prevSlideRef.current !== slider.active) {
      prevSlideRef.current = slider.active;
      // Small delay to let crossfade start, then replay entrance
      const t = setTimeout(() => setHeroEntranceKey((k) => k + 1), 100);
      return () => clearTimeout(t);
    }
  }, [slider.active]);

  return (
    <div className="overflow-hidden">

      {/* ===================================================================
           SECTION 1 — AYURVEDIC HERO
           =================================================================== */}
      <section ref={heroParallaxRef} className="relative min-h-screen flex flex-col lg:flex-row overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-amber-900">
        {/* Background image — render only the active slide for performance */}
        <div className="absolute inset-0 parallax-layer" style={{ transform: 'translateZ(0)' }}>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
            style={{
              backgroundImage: `url("${slide.image}")`,
              transform: 'translateZ(0)',
              filter: 'blur(1px)',
            }}
          />
          {/* Only render exiting slide if crossfading — remove after animation */}
          {exitingIdx !== null && (
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 animate-crossfade-out"
              style={{
                backgroundImage: `url("${HERO_SLIDES[exitingIdx].image}")`,
                filter: 'blur(1px)',
              }}
            />
          )}

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-emerald-900/70 to-amber-900/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/60 via-transparent to-transparent" />

          {/* Animated sunlight rays - reduced for performance */}




          {/* Background swaying herbs (silhouettes) */}
          <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none overflow-hidden">
            <div className="absolute bottom-0 left-0 w-20 h-32 opacity-10 animate-herb-sway" style={{ background: 'radial-gradient(ellipse at bottom, rgba(255,255,255,0.15), transparent 70%)', transformOrigin: 'bottom center' }} />
            <div className="absolute bottom-0 left-[20%] w-16 h-28 opacity-8 animate-herb-sway" style={{ background: 'radial-gradient(ellipse at bottom, rgba(255,255,255,0.12), transparent 70%)', transformOrigin: 'bottom center', animationDelay: '-2s' }} />
            <div className="absolute bottom-0 left-[40%] w-24 h-36 opacity-10 animate-herb-sway" style={{ background: 'radial-gradient(ellipse at bottom, rgba(255,255,255,0.15), transparent 70%)', transformOrigin: 'bottom center', animationDelay: '-4s' }} />
            <div className="absolute bottom-0 left-[65%] w-18 h-30 opacity-8 animate-herb-sway" style={{ background: 'radial-gradient(ellipse at bottom, rgba(255,255,255,0.1), transparent 70%)', transformOrigin: 'bottom center', animationDelay: '-1s' }} />
            <div className="absolute bottom-0 right-0 w-22 h-34 opacity-10 animate-herb-sway" style={{ background: 'radial-gradient(ellipse at bottom, rgba(255,255,255,0.15), transparent 70%)', transformOrigin: 'bottom center', animationDelay: '-3s' }} />
          </div>
        </div>

        {/* Floating herb labels — only render on larger screens for performance */}
        <div className="absolute inset-0 pointer-events-none z-10 hidden lg:block">
          {FLOATING_HERBS.slice(0, 3).map((herb, i) => (
            <FloatingHerbLabel key={i} herb={herb} index={i} />
          ))}
        </div>

        {/* Content Left */}
        <div className="relative z-20 w-full lg:w-1/2 flex items-center px-6 sm:px-12 lg:px-16 xl:px-20 py-24 lg:py-0">
          <div className="w-full max-w-xl" key={heroEntranceKey}>
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm text-white font-medium mb-6 animate-entrance-fade-left">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {slide.tag}
            </div>

            {/* Premium Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-4 animate-entrance-bounce-up" style={{ animationDelay: '0.15s' }}>
              {slide.title}
              <span className="block text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-light text-emerald-300 mt-3">
                {slide.subtitle}
              </span>
            </h1>

            {/* Ayurvedic tagline */}
            <div className="flex items-center gap-3 mb-4 animate-entrance-fade" style={{ animationDelay: '0.25s' }}>
              <div className="h-px flex-1 bg-gradient-to-r from-emerald-400/30 to-transparent" />
              <span className="text-emerald-300 text-sm font-medium tracking-widest uppercase">Ayurvedic Wellness</span>
              <div className="h-px flex-1 bg-gradient-to-l from-emerald-400/30 to-transparent" />
            </div>

            <p className="text-base sm:text-lg text-white/70 leading-relaxed mb-8 max-w-lg animate-entrance-fade-up" style={{ animationDelay: '0.35s' }}>
              {slide.desc}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3 mb-10 animate-entrance-fade-up" style={{ animationDelay: '0.45s' }}>
              <Link to="/shop" className="group inline-flex items-center gap-2 bg-white text-gray-900 rounded-xl px-7 py-3.5 font-semibold hover:bg-emerald-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-0.5">
                Shop Now <FiShoppingCart className="w-4 h-4 group-hover:rotate-[-8deg] transition-transform" />
              </Link>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex max-w-md animate-entrance-fade-up" style={{ animationDelay: '0.55s' }}>
              <div className="relative flex-1">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search 1000+ products..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-l-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white/95 backdrop-blur-sm"
                />
              </div>
              <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3.5 rounded-r-xl font-semibold transition-all">
                <FiSearch className="w-4 h-4 sm:hidden" />
                <span className="hidden sm:inline">Search</span>
              </button>
            </form>

            {/* Slide navigation pills */}
            <div className="flex items-center gap-3 mt-10 pt-8 border-t border-white/10 animate-entrance-fade" style={{ animationDelay: '0.65s' }}>
              <button onClick={slider.prev} className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all" aria-label="Previous">
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-2">
                {HERO_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => slider.goTo(i)}
                    className={`rounded-full transition-all duration-500 ${
                      i === slider.active ? 'w-8 h-2.5 bg-white shadow-lg' : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/50'
                    }`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
              <button onClick={slider.next} className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all" aria-label="Next">
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel — Juice Bottle Showcase */}
        <div className="relative z-20 w-full lg:w-1/2 min-h-[50vh] lg:min-h-screen flex items-center justify-center px-6 sm:px-12 py-12 lg:py-0">
          <div className="w-full max-w-lg" key={`bottle-${heroEntranceKey}`} style={{ opacity: 0, animation: 'entrance-fade-scale 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards' }}>
            <JuiceBottleShowcase />
          </div>
        </div>

        {/* Scroll indicator */}
        <ScrollIndicator />

        {/* Slide counter */}
        <div className="absolute bottom-8 right-8 z-20 hidden lg:block">
          <span className="text-white/20 text-sm font-mono">
            {String(slider.active + 1).padStart(2, '0')} / {String(HERO_SLIDES.length).padStart(2, '0')}
          </span>
        </div>
      </section>


      {/* ===================================================================
           SECTION 2 — WHY OUR AYURVEDIC JUICE
           =================================================================== */}
      <section ref={benefitsRef} className="relative py-20 sm:py-28 bg-gradient-to-b from-white via-emerald-50/30 to-white overflow-hidden">
        {/* Decorative background leaves */}
        <div className="absolute top-0 left-0 w-64 h-64 opacity-5 pointer-events-none" style={{ transform: 'translateZ(0)' }}>
          <LeafSVG color="#059669" size={256} className="animate-float-leaf-1" />
        </div>
        <div className="absolute bottom-0 right-0 w-48 h-48 opacity-5 pointer-events-none">
          <LeafSVG color="#059669" size={192} className="animate-float-leaf-2" style={{ animationDelay: '-3s' }} />
        </div>
        <div className="absolute top-1/2 right-10 w-32 h-32 opacity-5 pointer-events-none">
          <LeafSVG color="#d97706" size={128} className="animate-float-leaf-3" style={{ animationDelay: '-1s' }} />
        </div>

        <div className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-16 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-14 sm:mb-18">
            <div className={`inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4 transition-all duration-700 ${
              benefitsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <IoLeaf className="w-4 h-4" /> Why Our Juice
            </div>
            <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-4 transition-all duration-700 delay-100 ${
              benefitsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}>
              Nature's Gift in{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
                Every Sip
              </span>
            </h2>
            <p className={`text-gray-500 max-w-2xl mx-auto text-base sm:text-lg transition-all duration-700 delay-200 ${
              benefitsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}>
              Crafted with ancient Ayurvedic wisdom and the purest natural ingredients nature has to offer
            </p>
          </div>

          {/* Benefit Cards Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
            {AYURVEDIC_BENEFITS.map((benefit, i) => (
              <BenefitCard key={i} benefit={benefit} index={i} isVisible={benefitsVisible} />
            ))}
          </div>
        </div>
      </section>


      {/* ===================================================================
           SECTION 3 — ABOUT COMPANY
           =================================================================== */}
      <section ref={aboutRef} className="relative py-20 sm:py-28 bg-gray-50 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-emerald-100/30 blur-3xl pointer-events-none" style={{ transform: 'translateZ(0)' }} />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-amber-100/20 blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-16">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* LEFT — Image with animated frame */}
            <div className={`w-full lg:w-[45%] relative transition-all duration-800 ${
              aboutVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
            }`} style={{ transitionDuration: '0.8s' }}>
              {/* Floating decorative herbs */}
              <div className="absolute -top-6 -left-6 z-10 animate-float-decor pointer-events-none">
                <LeafSVG color="#059669" size={48} />
              </div>
              <div className="absolute -bottom-4 -right-4 z-10 animate-float-decor-2 pointer-events-none" style={{ animationDelay: '-2s' }}>
                <LeafSVG color="#d97706" size={36} />
              </div>
              <div className="absolute top-1/2 -right-8 z-10 animate-float-decor pointer-events-none" style={{ animationDelay: '-4s' }}>
                <LeafSVG color="#10b981" size={28} />
              </div>

              {/* Animated frame */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 animate-frame-pulse">
                {/* Image with slow zoom */}
                <div className="aspect-[4/5] sm:aspect-[3/4] overflow-hidden">
                  <img
                    src="https://myriyansh.com/site/images/2.jpg"
                    alt="Our Ayurvedic Heritage"
                    loading="lazy"
                    decoding="async"
                    className={`w-full h-full object-cover ${aboutVisible ? 'animate-slow-zoom' : ''}`}
                    style={{ transformOrigin: 'center center' }}
                    onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.style.background = 'linear-gradient(135deg, #d1fae5, #a7f3d0)'; }}
                  />
                </div>

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/30 via-transparent to-transparent" />

                {/* Decorative corner elements */}
                <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-white/40 rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-white/40 rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-white/40 rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-white/40 rounded-br-lg" />

                {/* Overlay text on image */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 text-xs text-white font-medium">
                    <FiFeather className="w-3 h-3" /> Since 1998
                  </div>
                </div>
              </div>

              {/* Decorative dots pattern */}
              <div className="absolute -bottom-6 -left-6 w-32 h-32 opacity-15 pointer-events-none">
                <div className="grid grid-cols-6 gap-3">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — Content */}
            <div className={`w-full lg:w-[55%] transition-all duration-800 ${
              aboutVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
            }`} style={{ transitionDuration: '0.8s', transitionDelay: '0.2s' }}>
              {/* Tag */}
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                <FiFeather className="w-4 h-4" /> About Our Company
              </div>

              {/* Heading */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-6">
                Preserving{' '}
                <span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
                  Ancient Wisdom
                </span>
                <br />
                for Modern Wellness
              </h2>

              

              {/* Tagline */}
              <div className="mb-4">
                <p className="text-xl sm:text-2xl font-semibold text-emerald-700 italic">
                  Prandhara – The Essence of Healthy Living.
                </p>
              </div>

              {/* Prandhara Story */}
              <div className="space-y-4 mb-8">
                <p className="text-gray-600 leading-relaxed">
                  Prandhara, established in 2022, is dedicated to promoting health and wellness through a range of Ayurvedic and herbal products. Inspired by the quality and wellness-focused approach of Riyansh products, Prandhara aims to provide natural solutions that support a healthier lifestyle.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  The company focuses on offering carefully selected herbal, wellness, personal care, and health-support products designed to meet the needs of modern consumers. With a commitment to quality, authenticity, and customer satisfaction, Prandhara strives to make traditional Ayurvedic wisdom accessible to everyone.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Driven by the vision of enhancing health and well-being, Prandhara continues to build trust among its customers by delivering reliable products and exceptional service while promoting a natural and holistic approach to everyday wellness.
                </p>
              </div>



              {/* Animated Counters */}
              <div ref={aboutStatsRef} className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
                {[
                  { value: 50000, suffix: '+', label: 'Happy Customers', color: 'emerald' },
                  { value: 1000, suffix: '+', label: 'Products Sold', color: 'amber' },
                  { value: 200, suffix: '+', label: 'Herbal Ingredients', color: 'green' },
                  { value: 7, suffix: '+', label: 'Years Experience', color: 'blue' },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className={`relative bg-white rounded-xl p-4 sm:p-5 border border-gray-100 text-center group hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden`}
                    style={{ transitionDelay: `${i * 100}ms` }}
                  >
                    {/* Hover gradient */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                      stat.color === 'emerald' ? 'bg-gradient-to-b from-emerald-50/50 to-transparent' :
                      stat.color === 'amber' ? 'bg-gradient-to-b from-amber-50/50 to-transparent' :
                      stat.color === 'green' ? 'bg-gradient-to-b from-green-50/50 to-transparent' :
                      'bg-gradient-to-b from-blue-50/50 to-transparent'
                    }`} />

                    <p className={`relative z-10 text-2xl sm:text-3xl font-bold tracking-tight mb-0.5 ${
                      stat.color === 'emerald' ? 'text-emerald-600' :
                      stat.color === 'amber' ? 'text-amber-600' :
                      stat.color === 'green' ? 'text-green-600' :
                      'text-blue-600'
                    }`}>
                      <AnimatedCounter value={stat.value} isVisible={aboutStatsVisible} />
                      {aboutStatsVisible && <span>{stat.suffix}</span>}
                    </p>
                    <p className="relative z-10 text-xs sm:text-sm text-gray-500 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ===================================================================
           TRUST BADGES — Scrolling strip
           =================================================================== */}
      <section className="border-y border-gray-100 bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-16">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 py-5">
            {TRUST_BADGES.map((badge, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm text-gray-500">
                <badge.icon className="w-5 h-5 text-emerald-500" />
                <span className="font-medium">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ===================================================================
           BEST SELLERS
           =================================================================== */}
      {bestSellers.length > 0 && (
        <section className="py-20 sm:py-28 bg-white">
          <div className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-16">
            <div className="flex items-end justify-between mb-10 sm:mb-12">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Best Sellers</h2>
                <p className="text-gray-400 mt-2">Most popular products our customers love</p>
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${sellerIdx * (100 / visibleSellerCards)}%)` }}
                >
                  {bestSellers.map((product) => (
                    <div
                      key={product._id}
                      className="min-w-[50%] sm:min-w-[33.333%] lg:min-w-[25%] xl:min-w-[20%] px-2.5 sm:px-3"
                    >
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  onClick={() => setSellerIdx((p) => Math.max(0, p - 1))}
                  disabled={sellerIdx === 0}
                  className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Previous"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex gap-2">
                  {Array.from({ length: Math.max(1, maxSellerIdx + 1) }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSellerIdx(i)}
                      className={`rounded-full transition-all duration-300 ${
                        i === sellerIdx ? 'w-8 h-2.5 bg-emerald-600' : 'w-2.5 h-2.5 bg-gray-200 hover:bg-gray-300'
                      }`}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setSellerIdx((p) => Math.min(maxSellerIdx, p + 1))}
                  disabled={sellerIdx >= maxSellerIdx}
                  className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Next"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}


      {/* ===================================================================
           BLOG — Sliding cards
           =================================================================== */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-16">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-2 text-emerald-600 text-sm font-semibold mb-3 bg-emerald-50 px-4 py-1.5 rounded-full">
              <FiBookOpen className="w-4 h-4" /> From Our Blog
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Health & Wellness Insights</h2>
            <p className="text-gray-400 mt-3 max-w-xl mx-auto">Expert advice, Ayurvedic tips, and the latest from Prandhara</p>
          </div>

          {blogs.length > 0 ? (
            <div className="relative">
              {/* Cards wrapper */}
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${blogIdx * (100 / visibleCards)}%)` }}
                >
                  {blogs.map((blog) => (
                    <Link
                      key={blog._id}
                      to={`/blogs/${blog._id}`}
                      className="group min-w-[100%] sm:min-w-[50%] lg:min-w-[33.333%] px-3"
                    >
                      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-emerald-100 transition-all duration-500 hover:-translate-y-1 h-full flex flex-col">
                        {/* Image */}
                        <div className="relative aspect-video bg-gray-50 overflow-hidden">
                          {blog.image ? (
                            <img
                              src={blog.image}
                              alt={blog.title}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FiBookOpen className="w-10 h-10 text-gray-200" />
                            </div>
                          )}
                          <div className="absolute top-3 left-3 flex gap-2">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 backdrop-blur-sm text-gray-700 shadow-sm">
                              {blog.category || 'General'}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 flex flex-col flex-1">
                          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-emerald-600 transition-colors mb-2">
                            {blog.title}
                          </h3>
                          {blog.excerpt && (
                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-4 flex-1">
                              {blog.excerpt}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
                            <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
                              <FiCalendar className="w-3 h-3" />
                              {new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="text-emerald-600 text-xs font-medium group-hover:translate-x-0.5 transition-transform">
                              Read More &rarr;
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  onClick={() => setBlogIdx((p) => Math.max(0, p - 1))}
                  disabled={blogIdx === 0}
                  className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Previous"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex gap-2">
                  {Array.from({ length: Math.max(1, maxBlogIdx + 1) }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setBlogIdx(i)}
                      className={`rounded-full transition-all duration-300 ${
                        i === blogIdx ? 'w-8 h-2.5 bg-emerald-600' : 'w-2.5 h-2.5 bg-gray-200 hover:bg-gray-300'
                      }`}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setBlogIdx((p) => Math.min(maxBlogIdx, p + 1))}
                  disabled={blogIdx >= maxBlogIdx}
                  className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Next"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <FiBookOpen className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-400 text-sm">No blog posts available yet</p>
            </div>
          )}

          {/* View All */}
          <div className="text-center mt-8">
            <Link
              to="/blogs"
              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm group"
            >
              View All Articles <FiChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>





      {/* ===================================================================
           TESTIMONIALS
           =================================================================== */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-16">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-2 text-amber-600 text-sm font-semibold mb-3 bg-amber-50 px-4 py-1.5 rounded-full">
              <FiStar className="w-4 h-4" /> Testimonials
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">What Our Customers Say</h2>
            <p className="text-gray-400 mt-3">Trusted by healthcare professionals and patients alike</p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="overflow-hidden rounded-2xl">
              <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${testimonialIdx * 100}%)` }}>
                {TESTIMONIALS.map((t, i) => (
                  <div key={i} className="min-w-full px-1">
                    <div className="bg-gray-50 rounded-2xl p-8 sm:p-10 border border-gray-100">
                      <div className="flex gap-1 mb-6">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <FiStar key={j} className={`w-5 h-5 ${j < t.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-8 italic">&ldquo;{t.text}&rdquo;</p>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg">
                          {t.name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{t.name}</p>
                          <p className="text-sm text-gray-400">{t.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-6">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTestimonialIdx(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === testimonialIdx ? 'w-8 h-2.5 bg-gray-900' : 'w-2.5 h-2.5 bg-gray-200 hover:bg-gray-300'
                  }`}
                  aria-label={`Testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* ===================================================================
           FAQ
           =================================================================== */}
      <section className="py-20 sm:py-28 bg-gray-50/70">
        <div className="mx-auto max-w-3xl px-6 sm:px-12 lg:px-16">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-2 text-emerald-600 text-sm font-semibold mb-3 bg-emerald-50 px-4 py-1.5 rounded-full">
              <FiRefreshCw className="w-4 h-4" /> Help Center
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-gray-400 mt-3">Everything you need to know</p>
          </div>

          <div className="space-y-3">
            {FAQ_DATA.map((faq, i) => (
              <div key={i} className={`bg-white rounded-xl border transition-all duration-300 ${faqOpen === i ? 'border-emerald-200 shadow-md shadow-emerald-100/20' : 'border-gray-100 hover:border-gray-200'}`}>
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left font-medium text-gray-900"
                >
                  <span className="pr-4 text-sm sm:text-base">{faq.q}</span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${faqOpen === i ? 'bg-emerald-100 text-emerald-600 rotate-180' : 'bg-gray-100 text-gray-400'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>
                <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: faqOpen === i ? '300px' : '0px', opacity: faqOpen === i ? 1 : 0 }}>
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-4">{faq.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


    </div>
  );
};

export default Home;
