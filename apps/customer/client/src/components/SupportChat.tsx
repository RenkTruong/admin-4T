/** 4T support chat: public customer conversation stored per browser thread, plus direct Zalo escalation. */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { STORE } from "@/lib/store";
import { Loader2, MessageCircleMore, Minus, Send, X, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function SupportChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [threadKey, setThreadKey] = useState("");
  const [message, setMessage] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [contact, setContact] = useState("");
  useEffect(() => {
    const existing = localStorage.getItem("4t-support-thread");
    const key = existing || `4t-${crypto.randomUUID()}`;
    if (!existing) localStorage.setItem("4t-support-thread", key);
    setThreadKey(key);
  }, []);
  const thread = trpc.support.thread.useQuery({ threadKey }, { enabled: Boolean(threadKey), refetchInterval: open ? 15000 : false });
  const utils = trpc.useUtils();
  const send = trpc.support.send.useMutation({ onSuccess: () => { setMessage(""); utils.support.thread.invalidate({ threadKey }); } });
  const messages = useMemo(() => thread.data ?? [], [thread.data]);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!message.trim() || !threadKey) return; send.mutate({ threadKey, body: message, visitorName: visitorName || user?.name || undefined, contact: contact || user?.email || undefined }); };

  return <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
    {open && <section className="mb-3 w-[calc(100vw-2rem)] max-w-[370px] overflow-hidden rounded-[24px] border border-[#092C5C]/10 bg-white shadow-2xl shadow-[#092C5C]/20">
      <div className="flex items-center justify-between bg-[#092C5C] px-5 py-4 text-white"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12"><MessageCircleMore className="h-4 w-4" /></span><div><p className="text-sm font-extrabold">4T hỗ trợ nhanh</p><p className="mt-0.5 text-[11px] text-[#DCEAFF]">Phản hồi trong giờ làm việc</p></div></div><button onClick={() => setOpen(false)} aria-label="Thu nhỏ chat"><Minus className="h-5 w-5" /></button></div>
      <div className="max-h-[280px] min-h-[160px] space-y-3 overflow-y-auto bg-[#F6F9FF] p-4">{messages.length === 0 ? <div className="rounded-2xl bg-white p-3 text-sm leading-6 text-[#53657E]">Xin chào! 4T có thể hỗ trợ lịch lấy đồ, giá dịch vụ hoặc phương thức thanh toán.</div> : messages.map(item => <div key={item.id} className={`flex ${item.sender === "visitor" ? "justify-end" : "justify-start"}`}><p className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-5 ${item.sender === "visitor" ? "bg-[#E7425A] text-white" : "bg-white text-[#334866]"}`}>{item.body}</p></div>)}{thread.isFetching && <Loader2 className="h-4 w-4 animate-spin text-[#6D7F9B]" />}</div>
      {!user && <div className="grid gap-2 border-t border-[#092C5C]/8 p-3 sm:grid-cols-2"><Input value={visitorName} onChange={e => setVisitorName(e.target.value)} placeholder="Tên của bạn" className="h-9 rounded-lg" /><Input value={contact} onChange={e => setContact(e.target.value)} placeholder="SĐT/Zalo (tùy chọn)" className="h-9 rounded-lg" /></div>}
      <form onSubmit={submit} className="flex gap-2 border-t border-[#092C5C]/8 p-3"><Input value={message} onChange={e => setMessage(e.target.value)} placeholder="Nhập tin nhắn..." className="h-10 rounded-xl" /><Button type="submit" disabled={send.isPending || !message.trim()} className="h-10 w-10 shrink-0 rounded-xl bg-[#E7425A] p-0 hover:bg-[#C92F47]">{send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></form>
      <a href={STORE.zaloUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 border-t border-[#092C5C]/8 py-3 text-xs font-extrabold text-[#0A7FDB] hover:bg-[#F4F9FF]"><Zap className="h-3.5 w-3.5" />Chat Zalo 4T: {STORE.phone}</a>
    </section>}
    <Button onClick={() => setOpen(!open)} className="h-14 rounded-full bg-[#092C5C] px-5 shadow-lg shadow-[#092C5C]/25 hover:bg-[#123D75]">{open ? <X className="h-5 w-5" /> : <><MessageCircleMore className="mr-2 h-5 w-5" />Hỗ trợ 4T</>}</Button>
  </div>;
}
