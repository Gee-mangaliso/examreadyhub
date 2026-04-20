import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Phone, CheckCircle } from "lucide-react";

interface OTPVerificationProps {
  phoneNumber: string;
  onVerified: () => void;
}

const OTPVerification = React.forwardRef<HTMLDivElement, OTPVerificationProps>(({ phoneNumber, onVerified }, ref) => {
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const sendOTP = async () => {
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-otp", {
      body: { phone_number: phoneNumber },
    });
    setSending(false);

    if (error || data?.error) {
      toast({
        title: "Failed to send OTP",
        description: data?.error || error?.message,
        variant: "destructive",
      });
      return;
    }

    setSent(true);
    toast({ title: "OTP sent!", description: `Verification code sent to ${phoneNumber}` });
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      toast({ title: "Enter 6-digit code", variant: "destructive" });
      return;
    }

    setVerifying(true);
    const { data, error } = await supabase.functions.invoke("verify-otp", {
      body: { phone_number: phoneNumber, otp_code: otp },
    });
    setVerifying(false);

    if (error || data?.error) {
      toast({
        title: "Verification failed",
        description: data?.error || error?.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Phone verified!" });
    onVerified();
  };

  return (
    <div ref={ref} className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Phone className="h-4 w-4" />
        <span>Verify {phoneNumber}</span>
      </div>
      {!sent ? (
        <Button onClick={sendOTP} disabled={sending} className="w-full">
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Send Verification Code"
          )}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Enter 6-digit code</Label>
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="text-center text-lg tracking-widest"
            />
          </div>
          <Button onClick={verifyOTP} disabled={verifying} className="w-full">
            {verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Verify
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={sendOTP} disabled={sending} className="w-full text-xs">
            Resend code
          </Button>
        </div>
      )}
    </div>
  );
});

OTPVerification.displayName = "OTPVerification";

export default OTPVerification;
