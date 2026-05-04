"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BrandProfile } from "@/db/schema";
import { saveBrandAction, type BrandState } from "./actions";

export function BrandForm({ initial }: { initial: BrandProfile | null }) {
  const [state, formAction, isPending] = useActionState<BrandState, FormData>(saveBrandAction, undefined);

  useEffect(() => {
    if (state?.success) {
      const t = setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <Card>
        <CardHeader>
          <CardTitle>Cơ bản</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Tên brand *"
            name="name"
            defaultValue={initial?.name ?? ""}
            placeholder="Ví dụ: HL17 AI"
            required
          />
          <Field
            label="Màu chính (hex)"
            name="primaryColor"
            defaultValue={initial?.primaryColor ?? "#FF6B35"}
            placeholder="#FF6B35"
          />
          <Field
            label="Default CTA"
            name="defaultCta"
            defaultValue={initial?.defaultCta ?? ""}
            placeholder="Follow để xem thêm"
          />
          <Field
            label="Submagic Template ID"
            name="submagicTemplateId"
            defaultValue={initial?.submagicTemplateId ?? ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice & Avatar</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field
            label="ElevenLabs Voice ID"
            name="voiceIdElevenLabs"
            defaultValue={initial?.voiceIdElevenLabs ?? ""}
          />
          <Field
            label="Argil Avatar ID"
            name="avatarIdArgil"
            defaultValue={initial?.avatarIdArgil ?? ""}
          />
          <Field
            label="Argil Voice ID"
            name="voiceIdArgil"
            defaultValue={initial?.voiceIdArgil ?? ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tone & Style</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TextareaField
            label="Voice style"
            name="voiceStyle"
            defaultValue={initial?.voiceStyle ?? ""}
            placeholder="Casual, energetic Vietnamese, hơi đùa..."
          />
          <TextareaField
            label="Signature phrases"
            name="signaturePhrases"
            defaultValue={initial?.signaturePhrases ?? ""}
            placeholder="Thật ra thì..., Nói thẳng nha"
          />
          <TextareaField
            label="Content pillars"
            name="contentPillars"
            defaultValue={initial?.contentPillars ?? ""}
            placeholder="Tech, AI, Productivity"
          />
          <TextareaField
            label="Banned topics"
            name="bannedTopics"
            defaultValue={initial?.bannedTopics ?? ""}
            placeholder="Politics, Religion, Crypto"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Examples (cho Claude học theo)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TextareaField
            label="Hook examples (mỗi dòng 1 hook)"
            name="hookExamples"
            defaultValue={initial?.hookExamples ?? ""}
            rows={8}
          />
          <TextareaField
            label="Script examples"
            name="scriptExamples"
            defaultValue={initial?.scriptExamples ?? ""}
            rows={8}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm">
          {state?.error && <span className="text-destructive">{state.error}</span>}
          {state?.success && <span className="text-green-500">✓ Đã lưu</span>}
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={rest.name}>{label}</Label>
      <Input id={rest.name} {...rest} />
    </div>
  );
}

function TextareaField({
  label,
  ...rest
}: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={rest.name}>{label}</Label>
      <Textarea id={rest.name} {...rest} />
    </div>
  );
}
