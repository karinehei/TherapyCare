import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { ApiError } from "@/api/client";
import { PHQ9_QUESTIONS, GAD7_QUESTIONS } from "@/referrals/constants";

const createSchema = z.object({
  patient_name: z.string().min(1, "Name is required"),
  patient_email: z.string().email("Invalid email"),
  clinic: z.string().optional(),
  reason: z.string().optional(),
  questionnaire_type: z.enum(["phq9", "gad7", "none"]).optional(),
});

type CreateForm = z.infer<typeof createSchema>;

export function ReferralCreatePage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: clinicsRes } = useQuery({
    queryKey: ["clinics"],
    queryFn: () => api.get<{ results?: { id: number; name: string }[] }>("/clinics/"),
  });
  const clinics = clinicsRes && "results" in clinicsRes ? clinicsRes.results ?? [] : [];

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { questionnaire_type: "none" },
  });

  const qType = watch("questionnaire_type");
  const questions = qType === "phq9" ? PHQ9_QUESTIONS : qType === "gad7" ? GAD7_QUESTIONS : [];
  const [qAnswers, setQAnswers] = useState<Record<number, number>>({});

  useEffect(() => {
    setQAnswers({});
  }, [qType]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateForm) => {
      const payload: Record<string, unknown> = {
        patient_name: data.patient_name,
        patient_email: data.patient_email,
        reason: data.reason || undefined,
      };
      if (data.clinic) payload.clinic = parseInt(data.clinic, 10);

      if (data.questionnaire_type && data.questionnaire_type !== "none") {
        const answers: Record<string, number> = {};
        let score = 0;
        questions.forEach((_, i) => {
          const num = qAnswers[i] ?? 0;
          answers[`q${i + 1}`] = num;
          score += num;
        });
        payload.questionnaire = {
          type: data.questionnaire_type,
          answers,
          score,
        };
      }

      return api.post<{ id: number }>("/referrals/", payload);
    },
    onSuccess: (data) => {
      navigate(`/app/referrals/${data.id}`);
    },
    onError: (err: unknown) => {
      setServerError(err instanceof ApiError ? String(err.detail) : "Failed to create referral");
    },
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">New Referral</h1>
        <p className="page-subtitle">Submit a referral request</p>
      </div>

      <div className="card">
        <div className="card-body">
          {serverError && (
            <div className="empty-state error" style={{ marginBottom: "1rem", textAlign: "left" }}>
              {serverError}
            </div>
          )}
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))}>
            <div className="form-grid">
              <div className="input-group">
                <label htmlFor="patient_name">Name *</label>
                <input
                  id="patient_name"
                  className={`input ${errors.patient_name ? "input-error" : ""}`}
                  {...register("patient_name")}
                />
                {errors.patient_name && (
                  <div className="input-error-message">{errors.patient_name.message}</div>
                )}
              </div>
              <div className="input-group">
                <label htmlFor="patient_email">Email *</label>
                <input
                  id="patient_email"
                  type="email"
                  className={`input ${errors.patient_email ? "input-error" : ""}`}
                  {...register("patient_email")}
                />
                {errors.patient_email && (
                  <div className="input-error-message">{errors.patient_email.message}</div>
                )}
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="clinic">Clinic (optional)</label>
              <select id="clinic" className="input" {...register("clinic")}>
                <option value="">Select clinic</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="reason">Reason for referral</label>
              <textarea
                id="reason"
                className="input"
                rows={3}
                {...register("reason")}
                placeholder="Brief reason for seeking therapy…"
              />
            </div>
            <div className="input-group">
              <label htmlFor="questionnaire_type">Screening questionnaire</label>
              <select id="questionnaire_type" className="input" {...register("questionnaire_type")}>
                <option value="none">None</option>
                <option value="phq9">PHQ-9 (Depression)</option>
                <option value="gad7">GAD-7 (Anxiety)</option>
              </select>
            </div>
            {questions.length > 0 && (
              <div className="questionnaire-section">
                <strong>
                  {qType === "phq9" ? "PHQ-9" : "GAD-7"} questions (0 = Not at all, 3 = Nearly every day)
                </strong>
                {questions.map((q, i) => (
                  <div key={i} className="input-group">
                    <label>{q}</label>
                    <select
                      className="input"
                      value={qAnswers[i] ?? 0}
                      onChange={(e) =>
                        setQAnswers((prev) => ({ ...prev, [i]: parseInt(e.target.value, 10) || 0 }))
                      }
                    >
                      {[0, 1, 2, 3].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Submitting…" : "Submit referral"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
