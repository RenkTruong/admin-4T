/** 4T storefront navigation: transparent access to service, guest order and member account. */
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Menu, PackagePlus, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export function FourTMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Về trang chủ 4T">
      <span className="brand-mark">4T</span>
      {!compact && <span className="leading-none"><b className="block text-sm tracking-[0.16em] text-[#092C5C]">GIẶT SẤY 4T</b><small className="mt-1 block text-[9px] font-bold tracking-[0.12em] text-[#61718A]">THƠM SẠCH · TIỆN LỢI</small></span>}
    </Link>
  );
}

export function StorefrontHeader() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const close = () => setOpen(false);
  const nav = [
    ["Dịch vụ", "/#dich-vu"],
    ["4T cam kết", "/#cam-ket"],
    ["Bảng giá", "/#bang-gia"],
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#092C5C]/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-7">
        <FourTMark />
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Điều hướng cửa hàng">
          {nav.map(([label, href]) => <a key={label} href={href} className="text-sm font-bold text-[#485875] transition-colors hover:text-[#E7425A]">{label}</a>)}
          <Link href="/tai-khoan" className={`text-sm font-bold transition-colors ${location === "/tai-khoan" ? "text-[#E7425A]" : "text-[#485875] hover:text-[#E7425A]"}`}>Tài khoản</Link>
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          {!loading && (isAuthenticated ? <Link href="/tai-khoan"><Button variant="ghost" className="font-bold text-[#092C5C]"><UserRound className="mr-2 h-4 w-4" />{user?.name?.split(" ")[0] || "Tài khoản"}</Button></Link> : <Button variant="ghost" onClick={startLogin} className="font-bold text-[#092C5C]">Đăng nhập</Button>)}
          <Link href="/dat-don"><Button className="h-11 rounded-full bg-[#E7425A] px-5 font-extrabold text-white hover:bg-[#C92F47]"><PackagePlus className="mr-2 h-4 w-4" />Đặt đơn</Button></Link>
        </div>
        <Button variant="ghost" onClick={() => setOpen(!open)} className="h-10 w-10 p-0 text-[#092C5C] sm:hidden" aria-label="Mở menu">{open ? <X /> : <Menu />}</Button>
      </div>
      {open && <div className="border-t border-[#092C5C]/10 bg-white px-5 py-4 sm:hidden"><div className="grid gap-1">{nav.map(([label, href]) => <a key={label} href={href} onClick={close} className="rounded-xl px-3 py-3 text-sm font-bold text-[#092C5C] hover:bg-[#F2F6FF]">{label}</a>)}<Link href="/tai-khoan" onClick={close} className="rounded-xl px-3 py-3 text-sm font-bold text-[#092C5C] hover:bg-[#F2F6FF]">Tài khoản & tích điểm</Link><Link href="/dat-don" onClick={close}><Button className="mt-2 w-full rounded-xl bg-[#E7425A] font-extrabold">Đặt đơn ngay</Button></Link></div></div>}
    </header>
  );
}
