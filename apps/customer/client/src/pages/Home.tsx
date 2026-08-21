/** 4T public brand landing page: a Vietnamese laundry storefront built around the four operating promises. */
import { Button } from "@/components/ui/button";
import { SupportChat } from "@/components/SupportChat";
import { StorefrontHeader } from "@/components/StorefrontHeader";
import { trpc } from "@/lib/trpc";
import { STORE } from "@/lib/store";
import { ArrowRight, BadgeCheck, Clock3, MapPin, PackageCheck, ShieldCheck, Sparkles, Star, Truck, WalletCards } from "lucide-react";
import { formatServicePrice, readServicePricing } from "@shared/servicePricing";
import { useEffect, useState } from "react";

const formatUpdatedAt = (value: string | null) => {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
};
import { Link } from "wouter";

const brandImage = "/manus-storage/4t-brand-banner_7f6871d5.jpg";

export default function Home() {
  const stats = trpc.storefront.stats.useQuery();
  const visit = trpc.storefront.visit.useMutation();
  const [visitorKey, setVisitorKey] = useState("");
  const [pricing, setPricing] = useState(readServicePricing);
  useEffect(() => { const existing = localStorage.getItem("4t-visitor-key"); const key = existing || crypto.randomUUID(); if (!existing) localStorage.setItem("4t-visitor-key", key); setVisitorKey(key); }, []);
  useEffect(() => { if (visitorKey) visit.mutate({ visitorKey }); }, [visitorKey]);
  useEffect(() => {
    const syncPricing = () => setPricing(readServicePricing());
    syncPricing();
    window.addEventListener("storage", syncPricing);
    return () => window.removeEventListener("storage", syncPricing);
  }, []);

  return <div className="min-h-screen bg-[#F7FAFF] text-[#102D55]"><StorefrontHeader />
    <main>
      <section className="relative isolate overflow-hidden bg-[#092C5C] text-white"><div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(69,149,255,.34),transparent_26%),linear-gradient(120deg,#092C5C_0%,#0B3977_52%,#10376B_100%)]" /><div className="relative mx-auto grid min-h-[600px] max-w-7xl items-center gap-10 px-4 py-14 sm:px-7 lg:grid-cols-[1.02fr_.98fr] lg:py-20"><div className="max-w-2xl"><p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold tracking-[0.14em] text-[#D9ECFF]"><Sparkles className="h-3.5 w-3.5 text-[#7BC7FF]" />GIẶT SẤY THEO CÔNG NGHỆ NHẬT</p><h1 className="mt-6 max-w-xl font-display text-5xl font-semibold leading-[.92] tracking-[-.045em] sm:text-6xl lg:text-7xl">Giặt sạch sâu.<br /><em className="text-[#AEE2FF]">Thơm sạch mỗi ngày.</em></h1><p className="mt-6 max-w-xl text-base leading-7 text-[#DCEAFF] sm:text-lg">4T giúp việc giặt giũ trở nên nhẹ nhàng: nhận tận nơi, xử lý cẩn thận và giao trả đúng hẹn tại Thuận An, Bình Dương.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/dat-don"><Button className="h-12 rounded-full bg-[#E7425A] px-6 font-extrabold hover:bg-[#C92F47]">Đặt đơn giặt sấy <ArrowRight className="ml-2 h-4 w-4" /></Button></Link><a href="#dich-vu"><Button variant="outline" className="h-12 rounded-full border-white/30 bg-white/7 px-6 font-bold text-white hover:bg-white/12 hover:text-white">Khám phá dịch vụ</Button></a></div><div className="mt-10 grid max-w-xl grid-cols-3 gap-3 border-t border-white/15 pt-6">{[["Sạch sâu", "Công nghệ giặt"],["Khô nhanh", "Sấy hiện đại"],["Nhận trả", "Tận nơi"]].map(([title, note]) => <div key={title}><p className="text-sm font-extrabold text-white">{title}</p><p className="mt-1 text-[11px] text-[#BFD6F2]">{note}</p></div>)}</div></div><div className="relative mx-auto w-full max-w-[560px]"><div className="absolute -inset-5 rounded-[36px] bg-[#55C5FF]/15 blur-3xl" /><div className="relative overflow-hidden rounded-[28px] border border-white/20 bg-white/10 p-3 shadow-2xl"><img src={brandImage} alt="Bảng hiệu thương hiệu 4T Giặt Sấy" className="aspect-[1.91/1] w-full rounded-[19px] object-cover" /><div className="mt-3 flex items-center justify-between px-2 pb-1"><span className="text-[11px] font-bold text-[#DCEAFF]">4T · TỬ TẾ ĐẾN TỪNG MẺ GIẶT</span><BadgeCheck className="h-4 w-4 text-[#7BC7FF]" /></div></div></div></div></section>

      <section className="mx-auto -mt-5 grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#092C5C]/10 bg-[#092C5C]/10 shadow-xl shadow-[#092C5C]/5 md:grid-cols-4"><Metric icon={<Clock3 />} value="06:30–21:00" label="Phục vụ mỗi ngày" /><Metric icon={<PackageCheck />} value={String(stats.data?.orders ?? 0)} label="Đơn hàng" /><Metric icon={<Star />} value="4T" label="Chuẩn phục vụ" /><Metric icon={<Sparkles />} value={String(stats.data?.visits ?? 0)} label="Lượt ghé thăm" /></section>

      <section id="cam-ket" className="mx-auto max-w-7xl px-4 py-20 sm:px-7"><div className="max-w-2xl"><p className="eyebrow">4T LÀ CÁCH CHÚNG TÔI PHỤC VỤ</p><h2 className="mt-4 font-display text-4xl font-semibold tracking-[-.035em] text-[#092C5C] sm:text-5xl">Mỗi đơn hàng là một lời hứa được giữ trọn.</h2></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Tử tế","Minh bạch khi nhận đồ, báo giá rõ ràng trước khi xử lý.",ShieldCheck],["Tận tâm","Kiểm tra mẻ giặt và ghi chú riêng theo yêu cầu khách.",Sparkles],["Thơm sạch","Giặt sạch sâu, sấy khô nhanh và chăm sóc sợi vải.",Star],["Tiện lợi","Đặt đơn online, nhận trả tận nơi, theo dõi đơn bằng tài khoản.",Truck]].map(([title, desc, Icon]) => <article key={String(title)} className="group rounded-3xl border border-[#092C5C]/9 bg-white p-6 shadow-sm transition-transform duration-200 hover:-translate-y-1"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F5FF] text-[#1677C7]"><Icon className="h-5 w-5" /></span><h3 className="mt-7 text-lg font-extrabold text-[#092C5C]">{String(title)}</h3><p className="mt-3 text-sm leading-6 text-[#61718A]">{String(desc)}</p></article>)}</div></section>

      <section id="dich-vu" className="bg-white py-20"><div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-7 lg:grid-cols-[.85fr_1.15fr]"><div><p className="eyebrow">DỊCH VỤ 4T</p><h2 className="mt-4 font-display text-4xl font-semibold tracking-[-.035em] text-[#092C5C] sm:text-5xl">Chọn nhịp giặt phù hợp với bạn.</h2><p className="mt-5 max-w-md text-base leading-7 text-[#61718A]">Đơn online giúp 4T sắp lịch lấy đồ chủ động. Khách có tài khoản được lưu lịch sử, tích điểm khi đặt đơn mới và nhận thêm 1 điểm khi đánh giá dịch vụ.</p><Link href="/dat-don"><Button className="mt-8 h-11 rounded-full bg-[#092C5C] px-5 font-extrabold hover:bg-[#123D75]">Đặt lịch lấy đồ</Button></Link></div><div className="grid gap-4 sm:grid-cols-2"><ServiceCard title={pricing.standard.label} price={`${formatServicePrice(pricing.standard.unitPrice)}/kg`} note={pricing.standard.detail} icon={<PackageCheck />} /><ServiceCard title={pricing.express.label} price={`${formatServicePrice(pricing.express.unitPrice)}/kg`} note={pricing.express.detail} icon={<Clock3 />} /><ServiceCard title="Nhận & giao tận nơi" price="Theo tuyến" note="4T xác nhận khung giờ trước khi đến" icon={<Truck />} /><ServiceCard title="Thanh toán linh hoạt" price="Tiền mặt · QR · Ví" note="Xác nhận phương thức ngay trong đơn" icon={<WalletCards />} /></div></div></section>

      <section id="bang-gia" className="mx-auto max-w-7xl px-4 py-20 sm:px-7"><div className="rounded-[32px] bg-[#E8F5FF] p-7 sm:p-10 lg:flex lg:items-center lg:justify-between"><div><p className="eyebrow">TÀI KHOẢN 4T</p><h2 className="mt-3 font-display text-4xl font-semibold tracking-[-.035em] text-[#092C5C]">Đặt đơn không cần đăng nhập.<br />Đăng nhập để nhận nhiều hơn.</h2><p className="mt-5 max-w-2xl text-sm leading-6 text-[#526782]">Khách vãng lai vẫn có thể tạo lịch nhận đồ. Khi có tài khoản 4T, bạn mới xem được tiến độ, lịch sử đơn, tích điểm sau khi hoàn tất và gửi đánh giá theo đơn.</p></div><div className="mt-7 flex shrink-0 flex-wrap gap-3 lg:mt-0"><Link href="/dat-don"><Button className="rounded-full bg-[#E7425A] px-5 font-extrabold hover:bg-[#C92F47]">Đặt đơn ngay</Button></Link><Link href="/tai-khoan"><Button variant="outline" className="rounded-full border-[#092C5C]/20 bg-white px-5 font-extrabold text-[#092C5C]">Tài khoản & điểm</Button></Link></div></div></section>

      <section className="mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-7">
        <div className="flex items-center justify-between gap-3 pb-4">
          <div>
            <p className="eyebrow">BẢNG GIÁ DỊCH VỤ</p>
            <h3 className="mt-1 text-2xl font-extrabold text-[#092C5C]">Dịch vụ & mức giá đang áp dụng</h3>
          </div>
          <span className="rounded-full bg-[#EAF7EE] px-3 py-1 text-xs font-bold text-[#1C7A43]">Cập nhật: {formatUpdatedAt(pricing.updatedAt)}</span>
        </div>
        <div className="overflow-x-auto rounded-[24px] border border-[#092C5C]/10 bg-white shadow-sm">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[#F6F9FF] text-[10px] font-extrabold uppercase tracking-[.12em] text-[#6D7F9B]">
              <tr>
                <th className="px-3 py-3">ID</th>
                <th className="px-3 py-3">Nhóm dịch vụ</th>
                <th className="px-3 py-3">Tên dịch vụ</th>
                <th className="px-3 py-3">Đơn vị</th>
                <th className="px-3 py-3">Giá</th>
                <th className="px-3 py-3">Ghi chú</th>
                <th className="px-3 py-3">Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {pricing.table.map(row => (
                <tr key={`${row.id}-${row.name}`} className="border-t border-[#092C5C]/8 align-top">
                  <td className="px-3 py-3 font-bold text-[#092C5C]">{row.id}</td>
                  <td className="px-3 py-3 text-[#334866]">{row.group}</td>
                  <td className="px-3 py-3 text-[#334866]">{row.name}</td>
                  <td className="px-3 py-3 text-[#334866]">{row.unit}</td>
                  <td className="px-3 py-3 font-extrabold text-[#E7425A]">{formatServicePrice(row.price)}</td>
                  <td className="px-3 py-3 text-[#4C5F7E]">{row.note || "-"}</td>
                  <td className="px-3 py-3 text-[#4C5F7E]">{formatUpdatedAt(pricing.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-[#092C5C]/10 bg-white"><div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-7 md:grid-cols-3"><div><h3 className="text-base font-extrabold text-[#092C5C]">{STORE.name}</h3><p className="mt-3 text-sm leading-6 text-[#61718A]">{STORE.tagline}.</p></div><div className="flex gap-3"><MapPin className="mt-1 h-4 w-4 shrink-0 text-[#E7425A]" /><p className="text-sm leading-6 text-[#61718A]">{STORE.address}</p></div><div><a href={STORE.zaloUrl} target="_blank" rel="noreferrer" className="font-extrabold text-[#0A7FDB] hover:underline">Hotline / Zalo: {STORE.phone}</a><p className="mt-2 text-sm text-[#61718A]">{STORE.serviceHours}</p></div></div></section>
    </main><SupportChat /></div>;
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) { return <div className="flex items-center gap-3 bg-white px-4 py-4 sm:px-5"><span className="text-[#1677C7]">{icon}</span><div><p className="text-base font-extrabold text-[#092C5C]">{value}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[.08em] text-[#71809A]">{label}</p></div></div>; }
function ServiceCard({ title, price, note, icon }: { title: string; price: string; note: string; icon: React.ReactNode }) { return <article className="rounded-3xl border border-[#092C5C]/9 bg-[#F8FBFF] p-6"><span className="text-[#1677C7]">{icon}</span><h3 className="mt-8 text-base font-extrabold text-[#092C5C]">{title}</h3><p className="mt-3 text-2xl font-extrabold text-[#E7425A]">{price}</p><p className="mt-2 text-sm text-[#66758E]">{note}</p></article>; }
