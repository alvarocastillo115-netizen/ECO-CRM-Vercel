import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// Brand colors from EcoSolutions
// Primary: hsl(177, 47.1%, 27.5%) → #256764 (deep teal/emerald)
// Deep: hsl(185, 66.3%, 16.3%) → #092f33 (dark teal - sidebar)

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 select-none", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-6",
        month: "space-y-3 min-w-[240px]",

        // Header: month name + year
        caption: "flex justify-center items-center relative h-9",
        caption_label: "text-sm font-semibold text-[#092f33] tracking-wide capitalize",

        // Nav arrows
        nav: "flex items-center gap-1",
        nav_button: cn(
          "h-7 w-7 inline-flex items-center justify-center rounded-full",
          "bg-transparent border border-transparent",
          "text-[#256764] hover:bg-[#256764]/10 hover:border-[#256764]/20",
          "transition-all duration-150 cursor-pointer"
        ),
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",

        // Day table
        table: "w-full border-collapse",
        head_row: "flex mb-1",
        head_cell: "w-9 h-7 flex items-center justify-center text-[11px] font-semibold text-[#092f33]/40 uppercase tracking-widest",
        row: "flex w-full mt-0.5",

        // Day cells
        cell: cn(
          "relative h-9 w-9 p-0 text-center",
          // Range fill between start and end
          "[&:has([aria-selected].day-range-middle)]:bg-[#256764]/10",
          "[&:has([aria-selected].day-range-middle)]:rounded-none",
          // Rounded on range start
          "first:[&:has([aria-selected])]:rounded-l-full",
          // Rounded on range end
          "last:[&:has([aria-selected])]:rounded-r-full",
          // Range start specific rounding
          "[&:has([aria-selected].day-range-start)]:rounded-l-full",
          "[&:has([aria-selected].day-range-end)]:rounded-r-full",
          "focus-within:relative focus-within:z-20"
        ),

        // Individual day button
        day: cn(
          "h-9 w-9 p-0 rounded-full text-sm font-medium",
          "flex items-center justify-center",
          "text-slate-700 transition-all duration-150",
          "hover:bg-[#256764]/15 hover:text-[#256764]",
          "aria-selected:opacity-100 cursor-pointer"
        ),

        // Range markers
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",

        // Selected day (single / start / end)
        day_selected: cn(
          "!bg-[#256764] !text-white font-bold rounded-full",
          "hover:!bg-[#1d524f] hover:!text-white",
          "focus:!bg-[#256764] focus:!text-white",
          "shadow-sm"
        ),

        // Days in the middle of range
        day_range_middle: cn(
          "day-range-middle",
          "aria-selected:bg-[#256764]/12 aria-selected:text-[#256764]",
          "aria-selected:rounded-none aria-selected:font-medium",
          "aria-selected:hover:bg-[#256764]/20"
        ),

        // Today
        day_today: cn(
          "border-2 border-[#256764]/40 text-[#256764] font-bold rounded-full",
          "aria-selected:border-transparent" // hide when selected
        ),

        // Outside month days
        day_outside: "text-slate-300 aria-selected:!bg-[#256764]/8 aria-selected:text-[#256764]/50",

        day_disabled: "text-slate-300 cursor-not-allowed pointer-events-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";
export { Calendar };
