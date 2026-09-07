"use client";

import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface TextFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  type?: string;
  placeholder?: string;
  description?: string;
  autoComplete?: string;
  autoFocus?: boolean;
}

/**
 * Wires react-hook-form's <Controller> to shadcn's Field primitives so
 * every form in the app gets the same label/input/error layout without
 * repeating the boilerplate at each call site.
 */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  type = "text",
  placeholder,
  description,
  autoComplete,
  autoFocus,
}: TextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.error ? true : undefined}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Input
            {...field}
            id={name}
            type={type}
            placeholder={placeholder}
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            aria-invalid={fieldState.error ? true : undefined}
          />
          {description && !fieldState.error ? (
            <FieldDescription>{description}</FieldDescription>
          ) : null}
          <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
        </Field>
      )}
    />
  );
}
