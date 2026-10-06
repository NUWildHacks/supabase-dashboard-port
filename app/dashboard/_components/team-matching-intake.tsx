"use client";

import { Loader2, OctagonAlert, X } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Empty, EmptyHeader, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel, FieldSeparator, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

import { submitTeamMatchingIntake } from "./_actions/submit-team-matching-intake.actions";
import { verifyTeammateEmail } from "./_actions/verify-teammate-email.actions";

const ROLE_OPTIONS = [
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Engineer",
  "Mobile Engineer",
  "Data Scientist",
  "Product Manager",
  "Designer",
] as const;

const SKILL_OPTIONS = [
  "JavaScript / TypeScript",
  "Python",
  "Java / Kotlin",
  "Swift / iOS",
  "React / Vue / Angular",
  "Node.js / Express",
  "SQL / Databases",
  "Machine Learning / AI",
  "UI/UX Design",
  "Figma",
  "AWS / Cloud",
  "Docker / DevOps",
] as const;

const WORK_STYLE_OPTIONS = [
  { value: "competitive", label: "Competitive: I came to win!" },
  { value: "casual", label: "Casual: just here for the vibes" },
  { value: "in_between", label: "In between: I try my best, without the pressure to win" },
] as const;

const GENDER_PREFERENCE_OPTIONS = [
  { value: "no_preference", label: "No preference" },
  { value: "prefer_mixed", label: "Prefer a mixed-gender team" },
  { value: "prefer_same", label: "Prefer same-gender teammates" },
] as const;

const WHERE_STAYING_OPTIONS = [
  { value: "prefer_not_to_say", label: "Prefer not to say" },
  { value: "on_site", label: "On-site (staying at the venue)" },
  { value: "on_campus", label: "On-campus housing (dorm)" },
  { value: "off_campus", label: "Off-campus accommodation" },
] as const;

const MAX_REQUIRED_TEAMMATES = 3;
const MAX_ADDITIONAL_NOTES_LENGTH = 1000;

type TeammateEntry = {
  email: string;
  name: string;
};

type FormState = {
  experience_level: string;
  preferred_roles: string[];
  skills: Record<string, number>;
  additional_notes: string;
  preferred_team_size: number;
  work_style: string;
  required_teammates: TeammateEntry[];
  gender_preference: string;
  where_staying: string;
};

const INITIAL_FORM_STATE: FormState = {
  experience_level: "",
  preferred_roles: [],
  skills: Object.fromEntries(SKILL_OPTIONS.map((skill) => [skill, 0])),
  additional_notes: "",
  preferred_team_size: 4,
  work_style: "",
  required_teammates: [],
  gender_preference: "",
  where_staying: "",
};

type TeamMatchingIntakeProps = {
  hasSubmitted: boolean;
  firstName: string;
  lastName: string;
  email: string;
  school: string;
  fieldOfStudy: string;
  eventStartTime: number;
};

const TeamMatchingIntake = ({
  hasSubmitted,
  firstName,
  lastName,
  email,
  school,
  fieldOfStudy,
  eventStartTime,
}: TeamMatchingIntakeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(hasSubmitted);

  const [consentChecked, setConsentChecked] = useState(false);

  const [teammateInput, setTeammateInput] = useState("");
  const [teammateVerifying, setTeammateVerifying] = useState(false);
  const [teammateError, setTeammateError] = useState<string | null>(null);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddTeammate = async () => {
    const teammateEmail = teammateInput.trim().toLowerCase();
    setTeammateError(null);

    if (!teammateEmail) return;

    if (teammateEmail === email.toLowerCase()) {
      setTeammateError("You can't add yourself as a teammate.");
      return;
    }

    if (form.required_teammates.some((t) => t.email === teammateEmail)) {
      setTeammateError("This email is already added.");
      return;
    }

    if (form.required_teammates.length >= MAX_REQUIRED_TEAMMATES) {
      setTeammateError("You can add at most 3 required teammates.");
      return;
    }

    if (form.required_teammates.length + 2 >= form.preferred_team_size) {
      setTeammateError(
        `Adding this teammate would fill your preferred team of ${form.preferred_team_size}. You don't need matching — connect with them directly.`
      );
      return;
    }

    setTeammateVerifying(true);
    const result = await verifyTeammateEmail(teammateEmail);
    setTeammateVerifying(false);

    if (!result.success) {
      setTeammateError(result.error ?? "Could not verify email.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      required_teammates: [...prev.required_teammates, { email: teammateEmail, name: result.name }],
    }));
    setTeammateInput("");
  };

  const handleTeammateKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTeammate();
    }
  };

  const handleRemoveTeammate = (email: string) => {
    setForm((prev) => ({
      ...prev,
      required_teammates: prev.required_teammates.filter((t) => t.email !== email),
    }));
    setTeammateError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const missing: string[] = [];
    if (!form.experience_level) missing.push("Experience level");
    if (form.preferred_team_size < 2) missing.push("Preferred team size");
    if (form.preferred_roles.length === 0) missing.push("Preferred roles");
    if (Object.values(form.skills).every((v) => v === 0)) missing.push("Skills");
    if (!form.work_style) missing.push("Work style");
    if (!form.gender_preference) missing.push("Team gender preference");
    if (!form.where_staying) missing.push("Overnight stay");
    if (!consentChecked) missing.push("Consent");

    if (missing.length > 0) {
      toast.error("Please fill in all required fields", {
        description: missing.join(", "),
      });
      return;
    }

    if (form.required_teammates.length + 1 >= form.preferred_team_size) {
      toast.error("Your required teammates already fill your preferred team size", {
        description: "You don't need team matching — close this and connect with your teammates directly.",
      });
      return;
    }

    setIsSubmitting(true);

    const result = await submitTeamMatchingIntake({
      ...form,
      gender_preference: form.gender_preference || "no_preference",
      where_staying: form.where_staying || "prefer_not_to_say",
      required_teammates: form.required_teammates.map((t) => t.email),
      consent: consentChecked,
    });

    setIsSubmitting(false);

    if (!result.success) {
      toast.error("Submission failed", { description: result.error });
      return;
    }

    setSubmitted(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setForm(INITIAL_FORM_STATE);
      setConsentChecked(false);
      setTeammateInput("");
      setTeammateError(null);
    }
  };

  const hasFullTeam = form.required_teammates.length + 1 >= form.preferred_team_size;

  return (
    <>
      <Card className="shadow-xs h-full flex flex-col">
        <CardHeader>
          <CardTitle>No team yet? We&lsquo;ll help you find one.</CardTitle>
          <CardDescription>
            Answer a few questions and we&lsquo;ll suggest teams based on skills, interests, and vibe. Totally optional
            &mdash; you&lsquo;re always free to form your own team.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          {submitted ? (
            <p className="text-muted-foreground text-sm">See your match after the opening ceremony!</p>
          ) : (
            <Button onClick={() => setIsOpen(true)}>Take the survey &rarr;</Button>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            Available until{" "}
            {new Date(eventStartTime).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}{" "}
            10:30AM
          </p>
        </CardFooter>
      </Card>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Team Matching Interest Form</DialogTitle>
            <DialogDescription>
              Help us match you with a compatible team. Some key details are required so we can suggest good matches,
              while the rest is optional but helps us fine-tune your match.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto overscroll-contain -mx-6 px-6 flex-1">
            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-lg font-semibold">You&apos;re all set!</p>
                <p className="text-muted-foreground text-sm">
                  Team suggestions will go live right after the opening ceremony! Check back then.
                </p>
                <DialogClose asChild>
                  <Button className="mt-2">Close</Button>
                </DialogClose>
              </div>
            ) : hasFullTeam ? (
              <Empty role="status" aria-live="polite">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <OctagonAlert aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>Looks like you already have a full team!</EmptyTitle>
                  <EmptyDescription>
                    You&apos;ve specified 3 required teammates — that&apos;s a full team of 4 including yourself. Team
                    matching isn&apos;t needed, close this and connect with your teammates directly!
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <form id="team-matching-form" onSubmit={handleSubmit}>
                <FieldGroup>
                  <FieldSet disabled={isSubmitting}>
                    <FieldGroup>
                      <div className="grid grid-cols-2 gap-4">
                        <Field>
                          <FieldLabel htmlFor="first_name">First name</FieldLabel>
                          <Input id="first_name" value={firstName} disabled />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="last_name">Last name</FieldLabel>
                          <Input id="last_name" value={lastName} disabled />
                        </Field>
                      </div>

                      <Field>
                        <FieldLabel htmlFor="school">School</FieldLabel>
                        <Input id="school" value={school} disabled />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="field_of_study">Major</FieldLabel>
                        <Input id="field_of_study" value={fieldOfStudy} disabled />
                      </Field>

                      <FieldSeparator />

                      <Field>
                        <FieldLabel htmlFor="experience_level">
                          Experience level <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Select
                          value={form.experience_level}
                          onValueChange={(v) => handleChange("experience_level", v)}
                        >
                          <SelectTrigger id="experience_level" className="w-full">
                            <SelectValue placeholder="Select your experience level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner (0–1 hackathons)</SelectItem>
                            <SelectItem value="intermediate">Intermediate (2–4 hackathons)</SelectItem>
                            <SelectItem value="experienced">Experienced (5+ hackathons)</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="preferred_team_size">
                          Preferred team size <span className="text-destructive">*</span>
                        </FieldLabel>
                        <div className="flex gap-2 mt-1">
                          {[2, 3, 4].map((size) => (
                            <button
                              key={size}
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => setForm((prev) => ({ ...prev, preferred_team_size: size }))}
                              className={`rounded-full border px-4 py-1 text-sm transition-colors ${
                                form.preferred_team_size === size
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-foreground border-border hover:bg-muted"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <Field>
                        <FieldLabel>
                          What roles are you interested in? <span className="text-destructive">*</span>
                        </FieldLabel>
                        <div
                          role="group"
                          aria-label="What roles are you interested in?"
                          className="flex flex-wrap gap-2 mt-1"
                        >
                          {ROLE_OPTIONS.map((role) => {
                            const selected = form.preferred_roles.includes(role);
                            return (
                              <button
                                key={role}
                                type="button"
                                aria-pressed={selected}
                                disabled={isSubmitting}
                                onClick={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    preferred_roles: selected
                                      ? prev.preferred_roles.filter((r) => r !== role)
                                      : [...prev.preferred_roles, role],
                                  }))
                                }
                                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                                  selected
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background text-foreground border-border hover:bg-muted"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {role}
                              </button>
                            );
                          })}
                        </div>
                      </Field>

                      <Field>
                        <FieldLabel>
                          Skills <span className="text-destructive">*</span>
                        </FieldLabel>
                        <p className="text-muted-foreground text-xs mb-3">
                          Rate your proficiency from 0 (none) to 5 (expert). Rate at least one.
                        </p>
                        <div className="flex flex-col gap-3">
                          {SKILL_OPTIONS.map((skill) => {
                            const value = form.skills[skill] ?? 0;
                            return (
                              <div key={skill} className="grid grid-cols-[1fr_2fr_auto] items-center gap-3">
                                <span className="text-sm text-muted-foreground">{skill}</span>
                                <Slider
                                  min={0}
                                  max={5}
                                  step={1}
                                  value={[value]}
                                  onValueChange={([v]) =>
                                    setForm((prev) => ({ ...prev, skills: { ...prev.skills, [skill]: v } }))
                                  }
                                  disabled={isSubmitting}
                                />
                                <span className="text-sm font-medium w-4 text-center">{value}</span>
                              </div>
                            );
                          })}
                        </div>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="work_style">
                          Work style <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Select value={form.work_style} onValueChange={(v) => handleChange("work_style", v)}>
                          <SelectTrigger id="work_style" className="w-full">
                            <SelectValue placeholder="Select your work style" />
                          </SelectTrigger>
                          <SelectContent>
                            {WORK_STYLE_OPTIONS.map(({ value, label }) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <FieldSeparator />

                      <Field>
                        <FieldLabel htmlFor="gender_preference">
                          Gender preference <span className="text-muted-foreground font-normal">(optional)</span>
                        </FieldLabel>
                        <Select
                          value={form.gender_preference}
                          onValueChange={(v) => handleChange("gender_preference", v)}
                        >
                          <SelectTrigger id="gender_preference" className="w-full">
                            <SelectValue placeholder="Select a preference" />
                          </SelectTrigger>
                          <SelectContent>
                            {GENDER_PREFERENCE_OPTIONS.map(({ value, label }) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="where_staying">
                          Where are you staying? <span className="text-muted-foreground font-normal">(optional)</span>
                        </FieldLabel>
                        <Select value={form.where_staying} onValueChange={(v) => handleChange("where_staying", v)}>
                          <SelectTrigger id="where_staying" className="w-full">
                            <SelectValue placeholder="Select where you're staying" />
                          </SelectTrigger>
                          <SelectContent>
                            {WHERE_STAYING_OPTIONS.map(({ value, label }) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field>
                        <FieldLabel>
                          Required teammates <span className="text-muted-foreground font-normal">(optional)</span>
                        </FieldLabel>
                        <p className="text-muted-foreground text-xs mb-2">
                          Enter the emails of people you want to be matched with. You can add up to 3.
                        </p>
                        <div className="rounded-md border border-yellow-400/60 bg-yellow-50 dark:bg-yellow-950/30 p-3 text-xs text-yellow-800 dark:text-yellow-300 mb-3">
                          <strong>Heads up:</strong> This only works if both of you add each other{"'"}s email. If one
                          person {"doesn't"}, this preference will be ignored.
                        </div>

                        {form.required_teammates.length < MAX_REQUIRED_TEAMMATES && (
                          <div className="flex gap-2">
                            <Input
                              id="teammate_input"
                              type="email"
                              placeholder="teammate@example.com"
                              value={teammateInput}
                              onChange={(e) => {
                                setTeammateInput(e.target.value);
                                setTeammateError(null);
                              }}
                              onKeyDown={handleTeammateKeyDown}
                              disabled={isSubmitting || teammateVerifying}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAddTeammate}
                              disabled={isSubmitting || teammateVerifying || !teammateInput.trim()}
                            >
                              {teammateVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                            </Button>
                          </div>
                        )}

                        {teammateError && <p className="text-destructive text-xs mt-1">{teammateError}</p>}

                        {form.required_teammates.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {form.required_teammates.map(({ email, name }) => (
                              <div
                                key={email}
                                className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-sm"
                              >
                                <span>
                                  {name} <span className="text-muted-foreground text-xs">({email})</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTeammate(email)}
                                  disabled={isSubmitting}
                                  className="text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed"
                                  aria-label={`Remove ${name}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </Field>

                      <FieldSeparator />

                      <Field>
                        <FieldLabel htmlFor="additional_notes">Anything else to add?</FieldLabel>
                        <Textarea
                          id="additional_notes"
                          maxLength={MAX_ADDITIONAL_NOTES_LENGTH}
                          placeholder="Any project ideas, constraints, or other notes…"
                          value={form.additional_notes}
                          onChange={(e) => handleChange("additional_notes", e.target.value)}
                          disabled={isSubmitting}
                          className="text-sm"
                        />
                      </Field>
                      <FieldSeparator />
                    </FieldGroup>
                  </FieldSet>
                </FieldGroup>

                <div className="flex flex-col items-start gap-3 mt-6 mb-6">
                  <p className="text-sm leading-snug">
                    We’ll use your responses to suggest potential teammates based on your skills, interests, and work
                    style. Your name, role, and profile may be shared with your suggested matches. This is totally
                    optional—you’re always free to form your own team.
                  </p>
                  <div className="flex w-full items-start gap-3 rounded-md border p-4">
                    <Checkbox
                      id="consent"
                      checked={consentChecked}
                      onCheckedChange={(v) => setConsentChecked(v === true)}
                      disabled={isSubmitting}
                    />
                    <label htmlFor="consent" className="text-sm leading-snug cursor-pointer select-none">
                      I agree to participate in team matching
                    </label>
                  </div>
                </div>
              </form>
            )}
          </div>

          {!submitted && !hasFullTeam && (
            <DialogFooter className="shrink-0 mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button form="team-matching-form" type="submit" disabled={isSubmitting || !consentChecked}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeamMatchingIntake;
