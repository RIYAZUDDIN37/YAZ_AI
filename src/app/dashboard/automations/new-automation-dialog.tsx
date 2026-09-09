"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TextField } from "@/components/form/text-field";
import {
  createAutomationSchema,
  automationTriggerValues,
  automationActionValues,
  leadStatusValues,
  type CreateAutomationInput,
} from "@/lib/validation/automations";
import { createAutomationAction } from "./actions";

const TRIGGER_LABEL: Record<(typeof automationTriggerValues)[number], string> = {
  LEAD_CREATED: "A lead is created",
  LEAD_STATUS_CHANGED: "A lead's status changes",
  CONVERSATION_ESCALATED: "The AI escalates a conversation",
  APPOINTMENT_BOOKED: "An appointment is booked",
};

const ACTION_LABEL: Record<(typeof automationActionValues)[number], string> = {
  NOTIFY_TEAM: "Notify the team",
  ADD_LEAD_NOTE: "Add a note to the lead",
  CHANGE_LEAD_STATUS: "Change the lead's status",
};

const STATUS_LABEL: Record<(typeof leadStatusValues)[number], string> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  CONTACTED: "Contacted",
  APPOINTMENT: "Appointment",
  PROPOSAL: "Proposal",
  WON: "Won",
  LOST: "Lost",
};

export function NewAutomationDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();

  const { control, handleSubmit, reset, watch } = useForm<CreateAutomationInput>({
    resolver: zodResolver(createAutomationSchema),
    defaultValues: {
      name: "",
      triggerEvent: "LEAD_CREATED",
      actionType: "NOTIFY_TEAM",
      actionMessage: "",
    },
  });

  const triggerEvent = watch("triggerEvent");
  const actionType = watch("actionType");

  function onSubmit(values: CreateAutomationInput) {
    setFormError(undefined);
    startTransition(async () => {
      const result = await createAutomationAction(values);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      setOpen(false);
      reset();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add automation
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add automation</DialogTitle>
          <DialogDescription>When something happens, do something — automatically.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <TextField control={control} name="name" label="Name" placeholder="Notify team on escalation" autoFocus />

            <Controller
              control={control}
              name="triggerEvent"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="triggerEvent">When…</FieldLabel>
                  <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                    <SelectTrigger id="triggerEvent" className="w-full">
                      <SelectValue>{(value) => TRIGGER_LABEL[value as keyof typeof TRIGGER_LABEL]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {automationTriggerValues.map((value) => (
                        <SelectItem key={value} value={value}>
                          {TRIGGER_LABEL[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            {triggerEvent === "LEAD_STATUS_CHANGED" ? (
              <Controller
                control={control}
                name="triggerStatus"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="triggerStatus">…to this status (optional — any if blank)</FieldLabel>
                    <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                      <SelectTrigger id="triggerStatus" className="w-full">
                        <SelectValue placeholder="Any status">
                          {(value) => (value ? STATUS_LABEL[value as keyof typeof STATUS_LABEL] : "Any status")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {leadStatusValues.map((value) => (
                          <SelectItem key={value} value={value}>
                            {STATUS_LABEL[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            ) : null}

            <Controller
              control={control}
              name="actionType"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="actionType">Then…</FieldLabel>
                  <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                    <SelectTrigger id="actionType" className="w-full">
                      <SelectValue>{(value) => ACTION_LABEL[value as keyof typeof ACTION_LABEL]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {automationActionValues.map((value) => (
                        <SelectItem key={value} value={value}>
                          {ACTION_LABEL[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            {actionType === "CHANGE_LEAD_STATUS" ? (
              <Controller
                control={control}
                name="actionStatus"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="actionStatus">New status</FieldLabel>
                    <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                      <SelectTrigger id="actionStatus" className="w-full">
                        <SelectValue placeholder="Pick a status">
                          {(value) => (value ? STATUS_LABEL[value as keyof typeof STATUS_LABEL] : "Pick a status")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {leadStatusValues.map((value) => (
                          <SelectItem key={value} value={value}>
                            {STATUS_LABEL[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            ) : (
              <Controller
                control={control}
                name="actionMessage"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="actionMessage">Message</FieldLabel>
                    <Textarea
                      {...field}
                      id="actionMessage"
                      rows={2}
                      placeholder={
                        actionType === "NOTIFY_TEAM"
                          ? "An AI conversation was escalated and needs attention."
                          : "Note to add to the lead"
                      }
                    />
                  </Field>
                )}
              />
            )}

            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Add automation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
