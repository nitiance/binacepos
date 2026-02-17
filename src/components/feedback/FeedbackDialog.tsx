import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";

import { usePOS } from "@/contexts/POSContext";
import { enqueueFeedback, flushFeedbackQueue, type FeedbackSeverity, type FeedbackType } from "@/lib/feedbackQueue";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function FeedbackDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { currentUser } = usePOS();
  const location = useLocation();

  const [type, setType] = useState<FeedbackType>("bug");
  const [severity, setSeverity] = useState<FeedbackSeverity>("low");
  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const appVersion = useMemo(() => {
    const v = String((import.meta as any)?.env?.VITE_APP_VERSION || "").trim();
    return v || null;
  }, []);

  useEffect(() => {
    if (!props.open) return;
    // Reset per-open so old text isn't reused accidentally.
    setType("bug");
    setSeverity("low");
    setRating(5);
    setTitle("");
    setMessage("");
  }, [props.open]);

  const canSubmit = Boolean(String(title).trim() && String(message).trim());

  const submit = async () => {
    if (!currentUser) return toast.error("You must be signed in");

    const businessId = String((currentUser as any)?.business_id || "").trim() || null;
    const localUserId = String((currentUser as any)?.id || "").trim() || null;
    if (!businessId || !localUserId) {
      return toast.error("Missing business context. Sign out and sign in again.");
    }

    const cleanTitle = String(title || "").trim();
    const cleanMsg = String(message || "").trim();
    if (cleanTitle.length < 3) return toast.error("Title must be 3+ characters");
    if (cleanMsg.length < 10) return toast.error("Message must be 10+ characters");

    if (submitting) return;
    setSubmitting(true);
    try {
      enqueueFeedback({
        business_id: businessId,
        local_user_id: localUserId,
        type,
        rating: type === "review" ? Math.max(1, Math.min(5, Math.trunc(rating || 5))) : null,
        title: cleanTitle,
        message: cleanMsg,
        severity,
        app_version: appVersion,
        platform: (() => {
          try {
            return Capacitor.getPlatform();
          } catch {
            return "web";
          }
        })(),
        route: location?.pathname || null,
        metadata: {
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
          online: typeof navigator !== "undefined" ? navigator.onLine : null,
        },
      });

      const res = await flushFeedbackQueue({
        currentUser: { id: localUserId, business_id: businessId },
        max: 5,
      });

      if (res.sent > 0) {
        toast.success("Feedback sent");
      } else if (res.skipped_reason === "offline") {
        toast.success("Saved offline. Will send when internet returns.");
      } else if (res.skipped_reason === "no_session" || res.skipped_reason === "no_user") {
        toast.success("Saved. Sign in while online to send.");
      } else {
        toast.success("Saved. Will retry automatically.");
      }

      props.onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Report a Bug / Send Feedback</DialogTitle>
          <DialogDescription>
            Short, precise reports get fixed faster. If you are offline, it will queue and send later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType((v as any) || "bug")}>
              <SelectTrigger>
                <SelectValue placeholder="bug" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="feature">Feature request</SelectItem>
                <SelectItem value="review">Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "review" ? (
            <div className="space-y-2">
              <Label>Rating</Label>
              <Select
                value={String(rating)}
                onValueChange={(v) => setRating(Math.max(1, Math.min(5, Number(v) || 5)))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="5" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 (Great)</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="1">1 (Bad)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity((v as any) || "low")}>
                <SelectTrigger>
                  <SelectValue placeholder="low" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary" />
        </div>

        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What happened? Steps to reproduce? What did you expect?"
            className="min-h-[140px]"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit || submitting}>
            {submitting ? "Saving..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

