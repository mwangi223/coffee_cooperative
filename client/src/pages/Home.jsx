"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { toast } from "react-toastify"; // Assuming you are using react-toastify for toast notifications

import { SelectItem } from "@/components/ui/select";
import { Doctors } from "@/constants";
import { getAppointmentSchema } from "@/lib/validation";
import { Appointment, Status } from "@/types/appwrite.types";

import "react-datepicker/dist/react-datepicker.css";

import CustomFormField from "../CustomFormField";
import SubmitButton from "../SubmitButton";
import { Form } from "../ui/form";
import { FormFieldType } from "@/types";
import {
  createAppointment,
  updateAppointment,
} from "@/lib/actions/appointment.actions";

export const AppointmentForm = ({
  userId,
  patientId,
  type = "create",
  appointment,
  setOpen,
}: {
  userId: string;
  patientId: string;
  type: "create" | "schedule" | "cancel";
  appointment?: Appointment;
  setOpen?: Dispatch<SetStateAction<boolean>>;
}) => {
  const router = useRouter();

  const AppointmentFormValidation = getAppointmentSchema(type);

  const { primaryPhysician, schedule, reason, note, cancellationReason } =
    appointment || {};

  // Type annotation for form
  const form: UseFormReturn<z.infer<typeof AppointmentFormValidation>> = useForm<z.infer<typeof AppointmentFormValidation>>({
    resolver: zodResolver(AppointmentFormValidation),
    defaultValues: {
      primaryPhysician: primaryPhysician || "",
      schedule: schedule ? new Date(schedule) : new Date(Date.now()),
      reason: reason || "",
      note: note || "",
      cancellationReason: cancellationReason || "",
    },
  });

  // Type annotation for onSubmit function
  const onSubmit = async (
    values: z.infer<typeof AppointmentFormValidation>
  ): Promise<void> => {
    const isLoading = true; // Inline loading state for submit button

    let status: Status;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; // Dynamically get the user's timezone

    // Refactored status determination logic
    status =
      type === "schedule"
        ? "scheduled"
        : type === "cancel"
        ? "cancelled"
        : "pending";

    try {
      if (type === "create" && patientId) {
        const appointment = {
          userId,
          patient: patientId,
          primaryPhysician: values.primaryPhysician,
          schedule: new Date(values.schedule),
          reason: values.reason!,
          status: status,
          note: values.note,
        };

        const newAppointment = await createAppointment(appointment);

        if (newAppointment) {
          form.reset();
          router.push(
            `/patients/${userId}/new-appointment/success?appointmentId=${newAppointment.$id}`
          );
        }
      } else if (appointment) {
        const appointmentToUpdate = {
          userId,
          appointmentId: appointment.$id!,
          timeZone, // Ensure `timeZone` is included
          appointment: {
            primaryPhysician: values.primaryPhysician,
            schedule: new Date(values.schedule),
            status: status,
            cancellationReason: values.cancellationReason,
          },
          type,
        };

        const updatedAppointment = await updateAppointment(appointmentToUpdate);

        if (updatedAppointment) {
          setOpen && setOpen(false);
          form.reset();
        }
      }
    } catch (error) {
      console.error("Error submitting appointment:", error);

      // Show a detailed error message in the console
      toast.error(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);

      // Optionally, show a toast notification or alert here for user feedback
      toast.error("There was an issue processing your appointment. Please try again.");
    }

    // Inline the isLoading state for the button instead of using useState
  };

  const renderFormFields = () => {
    if (type === "cancel") {
      return (
        <CustomFormField
          fieldType={FormFieldType.TEXTAREA}
          control={form.control}
          name="cancellationReason"
          label="Reason for cancellation"
          placeholder="Urgent meeting came up"
        />
      );
    }

    return (
      <>
        <CustomFormField
          fieldType={FormFieldType.SELECT}
          control={form.control}
          name="primaryPhysician"
          label="Doctor"
          placeholder="Select a doctor"
        >
          {Doctors.map((doctor, i) => (
            <SelectItem key={doctor.name + i} value={doctor.name}>
              <div className="flex cursor-pointer items-center gap-2">
                <Image
                  src={doctor.image}
                  width={32}
                  height={32}
                  alt="doctor"
                  className="rounded-full border border-dark-500"
                />
                <p>{doctor.name}</p>
              </div>
            </SelectItem>
          ))}
        </CustomFormField>

        <CustomFormField
          fieldType={FormFieldType.DATE_PICKER}
          control={form.control}
          name="schedule"
          label="Expected appointment date"
          showTimeSelect
          dateFormat="MM/dd/yyyy  -  h:mm aa"
        />

        <div
          className={`flex flex-col gap-6 ${
            type === "create" && "xl:flex-row"
          }`}
        >
          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="reason"
            label="Appointment reason"
            placeholder="Annual monthly check-up"
            disabled={type === "schedule"}
          />

          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="note"
            label="Comments/notes"
            placeholder="Prefer afternoon appointments, if possible"
            disabled={type === "schedule"}
          />
        </div>
      </>
    );
  };

  // Optimized button label assignment using a map
  const buttonLabels: Record<string, string> = {
    cancel: "Cancel Appointment",
    schedule: "Schedule Appointment",
    create: "Submit Appointment",
  };

  const buttonLabel = buttonLabels[type];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-6">
        {type === "create" && (
          <section className="mb-12 space-y-4">
            <h1 className="header">New Appointment</h1>
            <p className="text-dark-700">
              Request a new appointment in 10 seconds.
            </p>
          </section>
        )}

        {renderFormFields()}

        <SubmitButton
          isLoading={false} // Directly pass false or the loading state inline
          className={`${
            type === "cancel" ? "shad-danger-btn" : "shad-primary-btn"
          } w-full`}
        >
          {buttonLabel}
        </SubmitButton>
      </form>
    </Form>
  );
};
