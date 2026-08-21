/** 4T admin workspace: owner-only order operations, customer list, feedback and support conversations. */
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { BarChart3, Clock3, MessageCircleMore, PackageCheck, Star, UsersRound } from "lucide-react";
import * as XLSX from "xlsx";
import { addPricingTableRow, canManageServicePricing, formatServicePrice, importServicePricingRows, readServicePricing, updatePricingTableRow, writeServicePricing, type PricingTableRow } from "@shared/servicePricing";
import { useMemo, useState } from "react";

const PRICING_TEMPLATE_HEADERS = [
  ["ID", "Nhóm_Dịch_Vụ", "Tên_Dịch_Vụ", "Đơn_Vị_Tính", "Giá", "Ghi_Chú"],
  ["1", "Giặt Sấy Theo Kg", "Giặt sấy nhanh (dưới 5kg)", "Kg", "15000", "Giặt rửa nhanh, sấy khô trong 3h"],
  ["2", "Giặt Sấy Theo Kg", "Giặt sấy tiết kiệm (5-10kg)", "Kg", "8000", "Giặt rửa từng khúc"],
  ["3", "Giặt Hấp / Giặt Khô", "Giặt hấp áo vest / áo dài", "Bộ/Chiếc", "12000", "Sử dụng hóa chất chuyên dụng"],
];

const labels: Record<string, string> = { requested: "Đã tiếp nhận", confirmed: "Đã xác nhận", pickup: "Đang lấy đồ", washing: "Đang giặt", drying: "Đang sấy", ready: "Sẵn sàng giao trả", completed: "Hoàn tất", cancelled: "Đã hủy" };
const statusOptions = ["requested", "confirmed", "pickup", "washing", "drying", "ready", "completed", "cancelled"] as const;

export default function AdminPage() {
  const { user, loading } = useAuth();
  const canAccessAdmin = canManageServicePricing(user) || user?.role === "admin";

  return <DashboardLayout>{loading ? null : canAccessAdmin ? <AdminWorkspace /> : <div className="p-8"><p className="eyebrow">KHU VỰC HẠN CHẾ</p><h1 className="mt-3 text-3xl font-extrabold text-[#092C5C]">Bạn chưa có quyền quản trị 4T.</h1><p className="mt-3 text-sm text-[#61718A]">Chỉ tài khoản chủ sở hữu dự án hoặc nhân viên được cấp quyền điều chỉnh giá mới truy cập bảng điều hành.</p></div>}</DashboardLayout>;
}

function AdminWorkspace() {
  const { user } = useAuth();
  const metrics = trpc.admin.metrics.useQuery();
  const orders = trpc.admin.orders.useQuery();
  const support = trpc.admin.support.useQuery();
  const utils = trpc.useUtils();
  const [selectedThread, setSelectedThread] = useState("");
  const [reply, setReply] = useState("");
  const [pricing, setPricing] = useState(readServicePricing);
  const [savedNotice, setSavedNotice] = useState("");
  const [importedFileName, setImportedFileName] = useState("");
  const canManagePricing = canManageServicePricing(user);
  const update = trpc.admin.updateOrder.useMutation({ onSuccess: () => { utils.admin.orders.invalidate(); utils.admin.metrics.invalidate(); } });
  const replySupport = trpc.admin.replySupport.useMutation({ onSuccess: () => { setReply(""); utils.admin.support.invalidate(); } });
  const threads = useMemo(() => Object.values((support.data ?? []).reduce<Record<string, { threadKey: string; body: string; visitorName: string | null; contact: string | null; createdAt: Date }>>((all, message) => { if (!all[message.threadKey] || all[message.threadKey].createdAt < message.createdAt) all[message.threadKey] = message; return all; }, {})).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()), [support.data]);
  const messages = (support.data ?? []).filter(item => item.threadKey === selectedThread);
  const customers = useMemo(() => Object.values((orders.data ?? []).reduce<Record<string, { name: string; phone: string; orderCount: number; total: number }>>((all, order) => { const key = order.customerPhone; if (!all[key]) all[key] = { name: order.customerName, phone: order.customerPhone, orderCount: 0, total: 0 }; all[key].orderCount += 1; all[key].total += order.estimatedTotalVnd; return all; }, {})).sort((a, b) => b.total - a.total), [orders.data]);
  const reviews = useMemo(() => (orders.data ?? []).flatMap(order => order.review ? [{ ...order.review, publicCode: order.publicCode, customerName: order.customerName }] : []), [orders.data]);

  const handlePricingChange = (tier: "standard" | "express", value: number) => {
    const next = {
      ...pricing,
      [tier]: { ...pricing[tier], unitPrice: Number(value) || 0 },
    };
    writeServicePricing(next);
    setPricing(next);
    setSavedNotice("Đã lưu giá dịch vụ. Trang khách hàng sẽ cập nhật theo giá mới.");
    window.dispatchEvent(new StorageEvent("storage", { key: "4t-service-pricing", newValue: JSON.stringify(next) }));
  };

  const handlePricingFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) {
        setSavedNotice("File không hợp lệ. Vui lòng chọn file Excel có dữ liệu bảng giá.");
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
      if (!rows.length) {
        setSavedNotice("File Excel không có dữ liệu. Vui lòng kiểm tra lại bảng.");
        return;
      }

      const updated = importServicePricingRows(rows);
      setPricing(updated);
      setImportedFileName(file.name);
      setSavedNotice(`Đã cập nhật bảng giá từ file ${file.name}. Trang khách hàng đã đồng bộ.`);
      window.dispatchEvent(new StorageEvent("storage", { key: "4t-service-pricing", newValue: JSON.stringify(updated) }));
    } catch {
      setSavedNotice("Không thể đọc file Excel. Vui lòng chọn file .xlsx, .xls hoặc .csv hợp lệ.");
    } finally {
      event.target.value = "";
    }
  };

  const exportPricingTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(PRICING_TEMPLATE_HEADERS);
    XLSX.utils.book_append_sheet(workbook, sheet, "BangGia");
    XLSX.writeFile(workbook, "4t-pricing-template.xlsx");
  };

  const updatedTime = pricing.updatedAt ? new Date(pricing.updatedAt).toLocaleString("vi-VN") : "Chưa cập nhật";

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<Partial<PricingTableRow>>({});

  const persistTableRows = (nextRows: PricingTableRow[]) => {
    const next = {
      ...pricing,
      table: nextRows,
      updatedAt: new Date().toISOString(),
    };
    writeServicePricing(next);
    setPricing(next);
    setSavedNotice("Đã cập nhật bảng giá dịch vụ. Thời gian cập nhật mới đã được lưu.");
    window.dispatchEvent(new StorageEvent("storage", { key: "4t-service-pricing", newValue: JSON.stringify(next) }));
  };

  const handleRowUpdate = (rowId: string) => {
    if (!rowDraft.name) return;
    const nextRows = updatePricingTableRow(pricing.table, rowId, {
      ...rowDraft,
      price: Number(rowDraft.price ?? 0),
      updatedAt: new Date().toISOString(),
    });
    persistTableRows(nextRows);
    setEditingRowId(null);
    setRowDraft({});
  };

  const handleRowAdd = () => {
    const nextRows = addPricingTableRow(pricing.table, {
      group: "Khác",
      name: "Dịch vụ mới",
      unit: "Lần",
      price: 0,
      note: "",
    });
    const added = nextRows[nextRows.length - 1];
    setEditingRowId(added.id);
    setRowDraft({
      id: added.id,
      group: added.group,
      name: added.name,
      unit: added.unit,
      price: added.price,
      note: added.note,
      updatedAt: added.updatedAt,
    });
    persistTableRows(nextRows);
  };

  const beginEditRow = (row: PricingTableRow) => {
    setEditingRowId(row.id);
    setRowDraft({
      id: row.id,
      group: row.group,
      name: row.name,
      unit: row.unit,
      price: row.price,
      note: row.note,
      updatedAt: row.updatedAt,
    });
  };

  return <div className="mx-auto max-w-7xl space-y-8 p-2 sm:p-5">
    <div><p className="eyebrow">BẢNG ĐIỀU HÀNH 4T</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#092C5C]">Vận hành hôm nay</h1></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><AdminMetric icon={<UsersRound />} value={String(metrics.data?.visits ?? 0)} label="Lượt truy cập" /><AdminMetric icon={<PackageCheck />} value={String(metrics.data?.orders ?? 0)} label="Tổng số đơn hàng" /><AdminMetric icon={<Clock3 />} value={String(metrics.data?.pending ?? 0)} label="Đơn chờ xác nhận" /><AdminMetric icon={<Star />} value={(metrics.data?.averageRating ?? 0).toFixed(1)} label="Đánh giá trung bình" /></div>
    {canManagePricing && (
      <section className="rounded-2xl border border-[#092C5C]/10 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-extrabold text-[#092C5C]">Bảng giá dịch vụ</p>
            <p className="mt-1 text-sm text-[#6D7F9B]">Điều chỉnh giá theo kg hoặc cập nhật bảng giá bằng file Excel/CSV được gửi từ nhân sự.</p>
          </div>
          {savedNotice && <span className="rounded-full bg-[#EAF7EE] px-3 py-1 text-xs font-bold text-[#1C7A43]">{savedNotice}</span>}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {(["standard", "express"] as const).map(tier => (
            <div key={tier} className="rounded-xl border border-[#092C5C]/8 bg-[#F8FBFF] p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-extrabold text-[#092C5C]">{pricing[tier].label}</p>
                  <p className="mt-1 text-xs text-[#71809A]">{pricing[tier].eta} · {pricing[tier].detail}</p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-[#1677C7]">{formatServicePrice(pricing[tier].unitPrice)}</span>
              </div>
              <div className="mt-4">
                <label className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#71809A]">Giá / kg</label>
                <div className="mt-2 flex items-center gap-2">
                  <Input type="number" min={0} step={1000} value={pricing[tier].unitPrice} onChange={e => handlePricingChange(tier, Number(e.target.value))} className="bg-white" />
                  <span className="text-sm font-bold text-[#092C5C]">đ/kg</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-[#1677C7]/35 bg-[#F4FAFF] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-extrabold text-[#092C5C]">Cập nhật bảng giá bằng file Excel</p>
              <p className="mt-1 text-xs text-[#60718A]">Dùng file mẫu bên dưới, giữ nguyên tên cột và dữ liệu mẫu để import 1:1 theo đúng template.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={exportPricingTemplate} className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-extrabold text-[#092C5C] shadow-sm ring-1 ring-[#092C5C]/10 hover:bg-[#F7FAFF]">
                Tải file mẫu
              </button>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#092C5C] px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-[#0E3E7A]">
                Chọn file Excel
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handlePricingFileImport} />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={handleRowAdd} className="rounded-full bg-[#092C5C] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#123D75]">
            + Thêm dòng
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-[#092C5C]/10">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[#F6F9FF] text-[10px] font-extrabold uppercase tracking-[.12em] text-[#6D7F9B]">
              <tr>
                <th className="px-3 py-3">ID</th>
                <th className="px-3 py-3">Tên dịch vụ</th>
                <th className="px-3 py-3">Đơn vị tính</th>
                <th className="px-3 py-3">Giá</th>
                <th className="px-3 py-3">Ghi chú</th>
                <th className="px-3 py-3">Thời gian</th>
                <th className="px-3 py-3">Update</th>
              </tr>
            </thead>
            <tbody>
              {pricing.table.map(row => {
                const isEditing = editingRowId === row.id;
                return (
                  <tr key={`${row.id}-${row.name}`} className="border-t border-[#092C5C]/8 align-top">
                    <td className="px-3 py-3 font-bold text-[#092C5C]">{row.id}</td>
                    <td className="px-3 py-3 text-[#334866]">
                      {isEditing ? (
                        <Input value={rowDraft.name ?? ""} onChange={e => setRowDraft({ ...rowDraft, name: e.target.value })} className="min-w-[180px] bg-white text-sm" />
                      ) : (
                        <span className="min-w-[180px] text-base font-semibold text-[#334866]">{row.name}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[#334866]">
                      {isEditing ? (
                        <select value={rowDraft.unit ?? "Kg"} onChange={e => setRowDraft({ ...rowDraft, unit: e.target.value })} className="rounded-lg border border-[#092C5C]/15 bg-white px-2 py-2 text-sm text-[#334866]">
                          <option value="Lần">Lần</option>
                          <option value="Kg">Kg</option>
                        </select>
                      ) : (
                        row.unit
                      )}
                    </td>
                    <td className="px-3 py-3 text-[#334866]">
                      {isEditing ? (
                        <Input type="number" min={0} value={String(rowDraft.price ?? 0)} onChange={e => setRowDraft({ ...rowDraft, price: Number(e.target.value) || 0 })} className="min-w-[120px] bg-white text-sm" />
                      ) : (
                        <span className="font-extrabold text-[#E7425A]">{formatServicePrice(row.price)}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[#4C5F7E]">
                      {isEditing ? (
                        <Input value={rowDraft.note ?? ""} onChange={e => setRowDraft({ ...rowDraft, note: e.target.value })} className="min-w-[180px] bg-white text-sm" />
                      ) : (
                        row.note || "-"
                      )}
                    </td>
                    <td className="px-3 py-3 text-[#4C5F7E]">{row.updatedAt ? new Date(row.updatedAt).toLocaleString("vi-VN") : "Chưa cập nhật"}</td>
                    <td className="px-3 py-3 text-[#4C5F7E]">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleRowUpdate(row.id)} className="rounded-full bg-[#0D8B5A] px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-[#0B734B]">
                            Lưu
                          </button>
                          <button type="button" onClick={() => { setEditingRowId(null); setRowDraft({}); }} className="rounded-full border border-[#092C5C]/10 bg-white px-3 py-1.5 text-[11px] font-extrabold text-[#092C5C] hover:bg-[#F8FBFF]">
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => beginEditRow(row)} className="rounded-full border border-[#092C5C]/10 bg-white px-3 py-1.5 text-[11px] font-extrabold text-[#092C5C] hover:bg-[#F8FBFF]">
                          Update
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    )}
    <section className="rounded-2xl border border-[#092C5C]/10 bg-white"><div className="flex items-center justify-between border-b border-[#092C5C]/8 p-5"><div><p className="text-base font-extrabold text-[#092C5C]">Đơn hàng mới nhất</p><p className="mt-1 text-sm text-[#6D7F9B]">Đổi trạng thái để cập nhật tiến độ và tự động tích điểm cho đơn thành viên khi hoàn tất.</p></div><BarChart3 className="h-5 w-5 text-[#1677C7]" /></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-[#F6F9FF] text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71809A]"><tr><th className="px-5 py-3">Mã đơn</th><th className="px-5 py-3">Khách hàng</th><th className="px-5 py-3">Dịch vụ</th><th className="px-5 py-3">Thanh toán</th><th className="px-5 py-3">Trạng thái</th></tr></thead><tbody>{orders.data?.map(order => <tr key={order.id} className="border-t border-[#092C5C]/7"><td className="px-5 py-4 text-xs font-extrabold text-[#092C5C]">{order.publicCode}<span className="mt-1 block font-normal text-[#71809A]">{new Date(order.createdAt).toLocaleString("vi-VN")}</span></td><td className="px-5 py-4 text-sm"><b className="block text-[#334866]">{order.customerName}</b><span className="text-[#71809A]">{order.customerPhone}</span></td><td className="px-5 py-4 text-sm text-[#61718A]">{order.estimatedKg} kg · {order.serviceTier === "express" ? "Nhanh" : "Tiêu chuẩn"}<b className="mt-1 block text-[#092C5C]">{order.estimatedTotalVnd.toLocaleString("vi-VN")}đ</b></td><td className="px-5 py-4 text-sm text-[#61718A]">{order.paymentMethod === "cash" ? "Tiền mặt" : order.paymentMethod === "bank_transfer" ? "App ngân hàng" : "Ví điện tử"}<span className="mt-1 block text-xs">{order.paymentStatus}</span></td><td className="px-5 py-4"><select value={order.status} onChange={e => update.mutate({ orderId: order.id, status: e.target.value as typeof statusOptions[number], note: labels[e.target.value] })} className="rounded-lg border border-[#092C5C]/12 bg-white px-3 py-2 text-xs font-bold text-[#334866]">{statusOptions.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select></td></tr>)}{!orders.data?.length && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#71809A]">Chưa có đơn hàng nào từ website.</td></tr>}</tbody></table></div></section>
    <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-[#092C5C]/10 bg-white p-5"><p className="font-extrabold text-[#092C5C]">Khách hàng từ website</p><div className="mt-4 divide-y divide-[#092C5C]/8">{customers.slice(0, 6).map(customer => <div key={customer.phone} className="flex items-center justify-between py-3"><div><p className="text-sm font-bold text-[#334866]">{customer.name}</p><p className="mt-1 text-xs text-[#71809A]">{customer.phone} · {customer.orderCount} đơn</p></div><p className="text-xs font-extrabold text-[#092C5C]">{customer.total.toLocaleString("vi-VN")}đ</p></div>)}{!customers.length && <p className="py-8 text-center text-sm text-[#71809A]">Khách web sẽ hiện sau khi có đơn đầu tiên.</p>}</div></div><div className="rounded-2xl border border-[#092C5C]/10 bg-white p-5"><p className="font-extrabold text-[#092C5C]">Đánh giá theo đơn</p><div className="mt-4 space-y-3">{reviews.slice(0, 5).map(review => <div key={review.id} className="rounded-xl bg-[#F8FBFF] p-3"><p className="flex items-center gap-1 text-sm font-extrabold text-[#D98B00]"><Star className="h-4 w-4 fill-current" /> {review.rating}/5 <span className="ml-1 text-xs font-medium text-[#71809A]">· {review.publicCode}</span></p><p className="mt-2 text-xs leading-5 text-[#61718A]">{review.comment || "Khách hàng không để lại bình luận."}</p></div>)}{!reviews.length && <p className="py-8 text-center text-sm text-[#71809A]">Đánh giá từ đơn hoàn tất sẽ hiển thị ở đây.</p>}</div></div></section>
    <section className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]"><div className="rounded-2xl border border-[#092C5C]/10 bg-white p-5"><div className="flex items-center justify-between"><p className="font-extrabold text-[#092C5C]">Tin nhắn cần hỗ trợ</p><MessageCircleMore className="h-5 w-5 text-[#1677C7]" /></div><div className="mt-4 divide-y divide-[#092C5C]/8">{threads.map(thread => <button key={thread.threadKey} onClick={() => setSelectedThread(thread.threadKey)} className={`w-full p-3 text-left ${selectedThread === thread.threadKey ? "bg-[#E8F5FF]" : "hover:bg-[#F8FBFF]"}`}><p className="text-sm font-bold text-[#092C5C]">{thread.visitorName || "Khách vãng lai"}</p><p className="mt-1 truncate text-xs text-[#6D7F9B]">{thread.body}</p></button>)}{!threads.length && <p className="py-8 text-center text-sm text-[#71809A]">Chưa có tin nhắn.</p>}</div></div><div className="rounded-2xl border border-[#092C5C]/10 bg-white p-5"><p className="font-extrabold text-[#092C5C]">{selectedThread ? "Hội thoại khách hàng" : "Chọn một hội thoại"}</p><div className="mt-4 min-h-[180px] space-y-3 rounded-xl bg-[#F6F9FF] p-4">{messages.map(message => <div key={message.id} className={`flex ${message.sender === "staff" ? "justify-end" : "justify-start"}`}><p className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${message.sender === "staff" ? "bg-[#092C5C] text-white" : "bg-white text-[#334866]"}`}>{message.body}</p></div>)}</div><div className="mt-3 flex gap-2"><Input value={reply} onChange={e => setReply(e.target.value)} disabled={!selectedThread} placeholder="Nhập phản hồi của 4T…" /><Button disabled={!selectedThread || !reply.trim() || replySupport.isPending} onClick={() => replySupport.mutate({ threadKey: selectedThread, body: reply })} className="bg-[#E7425A] font-extrabold hover:bg-[#C92F47]">Gửi</Button></div></div></section>
  </div>;
}

function AdminMetric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) { return <article className="rounded-2xl border border-[#092C5C]/9 bg-white p-5"><span className="text-[#1677C7]">{icon}</span><p className="mt-5 text-3xl font-extrabold text-[#092C5C]">{value}</p><p className="mt-1 text-xs font-bold text-[#71809A]">{label}</p></article>; }
