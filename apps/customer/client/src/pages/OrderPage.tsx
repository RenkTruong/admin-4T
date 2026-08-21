/** 4T checkout: public order form that optionally binds to a signed-in account for tracking and loyalty. */
import { useAuth } from "@/_core/hooks/useAuth";
import { SupportChat } from "@/components/SupportChat";
import { StorefrontHeader } from "@/components/StorefrontHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { startLogin } from "@/const";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { STORE } from "@/lib/store";
import { AlertCircle, ArrowRight, CheckCircle2, CircleDollarSign, CreditCard, Loader2, MapPin, Sparkles, WalletCards } from "lucide-react";
import { formatServicePrice, getServiceTierPrice, readServicePricing } from "@shared/servicePricing";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

type Form = { customerName: string; customerPhone: string; customerEmail: string; pickupAddress: string; pickupWindow: string; serviceTier: "standard" | "express"; selectedServiceId: string; estimatedKg: number; notes: string; paymentMethod: "cash" | "bank_transfer" | "ewallet" };
const initialForm: Form = { customerName: "", customerPhone: "", customerEmail: "", pickupAddress: "", pickupWindow: "Sáng 08:00–11:00", serviceTier: "standard", selectedServiceId: "1", estimatedKg: 3, notes: "", paymentMethod: "cash" };

const resolveServiceTierFromServiceName = (name: string) => /nhanh|express/i.test(name) ? "express" : "standard";

export default function OrderPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const [form, setForm] = useState<Form>(initialForm);
  const [submitted, setSubmitted] = useState<{ code: string; total: number } | null>(null);
  const [pricing, setPricing] = useState(readServicePricing);
  const utils = trpc.useUtils();
  useEffect(() => { if (user?.name) setForm(current => ({ ...current, customerName: current.customerName || user.name || "", customerEmail: current.customerEmail || user.email || "" })); }, [user]);
  useEffect(() => {
    const syncPricing = () => setPricing(readServicePricing());
    syncPricing();
    window.addEventListener("storage", syncPricing);
    return () => window.removeEventListener("storage", syncPricing);
  }, []);
  const createOrder = trpc.storefront.createOrder.useMutation({
    onSuccess: order => {
      setSubmitted({ code: order.publicCode, total: order.estimatedTotalVnd });
      if (isAuthenticated) utils.account.orders.invalidate();
    },
    onError: () => {
      toast.error("Không thể tạo đơn hàng", {
        description: "Vui lòng kiểm tra các thông tin bắt buộc và thử lại sau.",
        duration: 5000,
      });
    },
  });
  const selectedService = useMemo(() => {
    const rows = pricing.table ?? [];
    return rows.find(item => item.id === form.selectedServiceId) ?? rows[0] ?? null;
  }, [form.selectedServiceId, pricing.table]);
  const estimated = useMemo(() => getServiceTierPrice(form.serviceTier, form.estimatedKg), [form.estimatedKg, form.serviceTier]);
  const update = <K extends keyof Form>(key: K, value: Form[K]) => setForm(current => ({ ...current, [key]: value }));
  const updateSelectedService = (serviceId: string) => {
    const nextService = pricing.table.find(item => item.id === serviceId) ?? pricing.table[0];
    if (!nextService) return;

    setForm(current => ({
      ...current,
      selectedServiceId: nextService.id,
      serviceTier: resolveServiceTierFromServiceName(nextService.name),
    }));
  };
  useEffect(() => {
    if (!pricing.table.length) return;
    const hasSelected = pricing.table.some(item => item.id === form.selectedServiceId);
    if (!hasSelected) {
      setForm(current => ({
        ...current,
        selectedServiceId: pricing.table[0].id,
        serviceTier: resolveServiceTierFromServiceName(pricing.table[0].name),
      }));
    }
  }, [form.selectedServiceId, pricing.table]);
  const submit = (e: React.FormEvent) => { e.preventDefault(); createOrder.mutate(form); };
  if (submitted) return <div className="min-h-screen bg-[#F7FAFF]"><StorefrontHeader /><main className="mx-auto max-w-2xl px-4 py-16 sm:px-7"><div className="rounded-[32px] border border-[#22A06B]/20 bg-white p-8 text-center shadow-xl shadow-[#092C5C]/5 sm:p-12"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E5F8EF] text-[#22A06B]"><CheckCircle2 className="h-8 w-8" /></span><p className="eyebrow mt-7">4T ĐÃ NHẬN LỊCH LẤY ĐỒ</p><h1 className="mt-3 font-display text-4xl font-semibold text-[#092C5C]">Đơn {submitted.code}</h1><p className="mt-5 text-sm leading-6 text-[#61718A]">Tạm tính <b className="text-[#E7425A]">{submitted.total.toLocaleString("vi-VN")}đ</b>. 4T sẽ gọi/xác nhận thời gian lấy đồ trước khi đến.</p>{isAuthenticated ? <Link href="/tai-khoan"><Button className="mt-8 rounded-full bg-[#092C5C] px-6 font-extrabold">Theo dõi đơn trong tài khoản <ArrowRight className="ml-2 h-4 w-4" /></Button></Link> : <div className="mt-8 rounded-2xl bg-[#FFF5F6] p-4 text-left"><p className="text-sm font-extrabold text-[#A22940]">Đây là đơn khách vãng lai</p><p className="mt-1 text-sm leading-6 text-[#7B5861]">Đơn đã được gửi, nhưng không có màn hình theo dõi hoặc điểm thưởng. Hãy đăng nhập trước khi đặt đơn tiếp theo để dùng các quyền lợi này.</p><Button onClick={startLogin} variant="outline" className="mt-4 rounded-full border-[#E7425A]/25 bg-white font-extrabold text-[#C92F47]">Đăng nhập tài khoản 4T</Button></div>}</div></main><SupportChat /></div>;
  return <div className="min-h-screen bg-[#F7FAFF]"><StorefrontHeader /><main className="mx-auto max-w-7xl px-4 py-10 sm:px-7 sm:py-14"><div className="grid gap-8 lg:grid-cols-[1.1fr_.72fr]"><section><p className="eyebrow">ĐẶT LỊCH NHẬN ĐỒ</p><h1 className="mt-3 font-display text-5xl font-semibold tracking-[-.04em] text-[#092C5C]">4T lo phần giặt.<br />Bạn giữ thời gian cho mình.</h1>{!loading && !isAuthenticated && <div className="mt-7 flex gap-3 rounded-2xl border border-[#F0B8C1] bg-[#FFF5F6] p-4"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#E7425A]" /><div><p className="text-sm font-extrabold text-[#A22940]">Bạn đang đặt đơn không cần tài khoản</p><p className="mt-1 text-sm leading-6 text-[#7B5861]">4T vẫn xác nhận và nhận đồ, nhưng bạn sẽ không xem được tiến độ đơn hoặc tích điểm trên website.</p><Button onClick={startLogin} variant="link" className="mt-1 h-auto p-0 text-sm font-extrabold text-[#C92F47]">Đăng nhập để nhận quyền lợi <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></div></div>}
        <form onSubmit={submit} className="mt-8 space-y-7 rounded-[28px] border border-[#092C5C]/9 bg-white p-5 shadow-sm sm:p-8"><fieldset><legend className="form-legend">1. Thông tin nhận đồ</legend><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Họ và tên" required><Input value={form.customerName} onChange={e => update("customerName", e.target.value)} required placeholder="Ví dụ: Nguyễn Minh Anh" /></Field><Field label="Số điện thoại" required><Input value={form.customerPhone} onChange={e => update("customerPhone", e.target.value)} required inputMode="tel" placeholder="09xx xxx xxx" /></Field><Field label="Email (tùy chọn)" className="sm:col-span-2"><Input value={form.customerEmail} onChange={e => update("customerEmail", e.target.value)} type="email" placeholder="nhanemail@example.com" /></Field><Field label="Địa chỉ lấy đồ" required className="sm:col-span-2"><Textarea value={form.pickupAddress} onChange={e => update("pickupAddress", e.target.value)} required placeholder="Số nhà, đường, phường/xã, ghi chú điểm nhận..." /></Field><Field label="Khung giờ mong muốn" required><select value={form.pickupWindow} onChange={e => update("pickupWindow", e.target.value)} className="form-select"><option>Sáng 08:00–11:00</option><option>Trưa 11:00–14:00</option><option>Chiều 14:00–17:00</option><option>Tối 17:00–20:00</option></select></Field><Field label="Khối lượng ước tính" required><div className="relative"><Input type="number" min="1" max="100" value={form.estimatedKg} onChange={e => update("estimatedKg", Number(e.target.value))} required /><span className="absolute right-3 top-2.5 text-sm font-bold text-[#61718A]">kg</span></div></Field></div></fieldset>
          <fieldset><legend className="form-legend">2. Chọn dịch vụ</legend><div className="mt-4"><Field label="Dịch vụ" required><select value={form.selectedServiceId} onChange={e => updateSelectedService(e.target.value)} className="form-select" aria-label="Chọn dịch vụ">
            {pricing.table.map(service => (
              <option key={service.id} value={service.id}>
                {service.name} · {service.unit} · {formatServicePrice(service.price)}
              </option>
            ))}
          </select></Field>{selectedService && <p className="mt-2 text-xs leading-5 text-[#71809A]">Đang chọn: <strong className="text-[#092C5C]">{selectedService.name}</strong> · {selectedService.unit} · {formatServicePrice(selectedService.price)}</p>}</div></fieldset>
          <fieldset><legend className="form-legend">3. Thanh toán</legend><div className="mt-4 grid gap-3 sm:grid-cols-3"><PaymentChoice active={form.paymentMethod === "cash"} onClick={() => update("paymentMethod", "cash")} icon={<CircleDollarSign />} title="Tiền mặt" note="Thanh toán khi nhận/giao" /><PaymentChoice active={form.paymentMethod === "bank_transfer"} onClick={() => update("paymentMethod", "bank_transfer")} icon={<CreditCard />} title="App ngân hàng" note="4T gửi QR sau xác nhận" /><PaymentChoice active={form.paymentMethod === "ewallet"} onClick={() => update("paymentMethod", "ewallet")} icon={<WalletCards />} title="Ví điện tử" note="4T gửi QR ví sau xác nhận" /></div><p className="mt-3 text-xs leading-5 text-[#71809A]">Chuyển khoản và ví điện tử chỉ được yêu cầu sau khi cửa hàng xác nhận nhận đồ; website chưa tự động trích tiền của bạn.</p></fieldset>
          <Field label="Ghi chú cho 4T"><Textarea value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="Đồ dễ phai màu, yêu cầu tách riêng, mã cổng..." /></Field>
          <div className="flex flex-col gap-4 border-t border-[#092C5C]/8 pt-6 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm leading-6 text-[#61718A]">Tạm tính <strong className="block text-xl text-[#E7425A]">{estimated.toLocaleString("vi-VN")}đ</strong></p><Button type="submit" disabled={createOrder.isPending} className="h-12 rounded-full bg-[#E7425A] px-7 font-extrabold hover:bg-[#C92F47]">{createOrder.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang tạo đơn</> : <>Gửi lịch lấy đồ <ArrowRight className="ml-2 h-4 w-4" /></>}</Button></div>
        </form></section>
      <aside className="space-y-5 lg:pt-20"><div className="rounded-[28px] bg-[#092C5C] p-7 text-white"><MapPin className="h-5 w-5 text-[#9CDBFF]" /><h2 className="mt-8 text-xl font-extrabold">4T sẽ xác nhận trước khi đến.</h2><p className="mt-3 text-sm leading-6 text-[#D6E8FF]">Lịch đặt online là yêu cầu nhận đồ. Nhân viên 4T gọi hoặc nhắn Zalo để chốt thời gian, khối lượng và phương thức thanh toán.</p><a href={STORE.zaloUrl} target="_blank" rel="noreferrer"><Button className="mt-6 rounded-full bg-white text-[#092C5C] hover:bg-[#E8F5FF]">Chat Zalo 4T</Button></a></div><div className="rounded-[28px] border border-[#092C5C]/9 bg-white p-7"><Sparkles className="h-5 w-5 text-[#1677C7]" /><h2 className="mt-5 text-base font-extrabold text-[#092C5C]">Tài khoản 4T có gì?</h2><ul className="mt-4 space-y-3 text-sm leading-6 text-[#61718A]"><li>• Xem tiến độ từng đơn đang xử lý</li><li>• Tạo đơn mới nhận ngay +3 điểm</li><li>• Đánh giá dịch vụ để nhận thêm +1 điểm</li></ul></div></aside></div></main><SupportChat /></div>;
}
function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) { return <label className={`block ${className || ""}`}><span className="mb-2 block text-sm font-bold text-[#334866]">{label}{required && <em className="ml-1 text-[#E7425A]">*</em>}</span>{children}</label>; }
function ServiceChoice({ active, onClick, title, price, detail }: { active: boolean; onClick: () => void; title: string; price: string; detail: string }) { return <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left transition-colors ${active ? "border-[#1677C7] bg-[#E8F5FF]" : "border-[#092C5C]/10 bg-[#F9FBFF] hover:border-[#1677C7]/40"}`}><p className="text-sm font-extrabold text-[#092C5C]">{title}</p><p className="mt-1 text-base font-extrabold text-[#E7425A]">{price}</p><p className="mt-2 text-xs text-[#71809A]">{detail}</p></button>; }
function PaymentChoice({ active, onClick, icon, title, note }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; note: string }) { return <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left transition-colors ${active ? "border-[#1677C7] bg-[#E8F5FF] text-[#092C5C]" : "border-[#092C5C]/10 bg-[#F9FBFF] text-[#61718A] hover:border-[#1677C7]/40"}`}><span className="block text-[#1677C7]">{icon}</span><p className="mt-4 text-sm font-extrabold text-[#092C5C]">{title}</p><p className="mt-1 text-[11px] leading-4">{note}</p></button>; }
