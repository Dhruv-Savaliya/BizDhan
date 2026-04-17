"use client";

import { useState } from "react";
import { Search, Filter, Calendar as CalendarIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

export type SortOption = "newest" | "oldest" | "highest" | "lowest";

interface TrackerFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  resultCount: number;
  onClearFilters: () => void;
}

export function TrackerFilterBar({
  searchQuery,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  sortBy,
  onSortChange,
  resultCount,
  onClearFilters,
}: TrackerFilterBarProps) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const hasFilters = searchQuery || dateRange.from || dateRange.to || sortBy !== "newest";
  const activeFilterCount = (searchQuery ? 1 : 0) + (dateRange.from || dateRange.to ? 1 : 0) + (sortBy !== "newest" ? 1 : 0);

  const FilterContent = () => (
    <>
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search entries..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-10 rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary/20 transition-all"
        />
      </div>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={`h-10 rounded-xl border-border/50 bg-background/50 justify-start text-left font-medium ${!dateRange.from && !dateRange.to && "text-muted-foreground"}`}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, yyyy")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-2xl border-border/50 shadow-xl bg-card/95 backdrop-blur-xl" align="center">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange.from}
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => onDateRangeChange({ from: range?.from, to: range?.to })}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      <Select value={sortBy} onValueChange={(val: SortOption) => onSortChange(val)}>
        <SelectTrigger className="h-10 w-[180px] rounded-xl border-border/50 bg-background/50 font-medium">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border/50 bg-card/95 backdrop-blur-xl shadow-xl">
          <SelectItem value="newest" className="rounded-lg">Newest first</SelectItem>
          <SelectItem value="oldest" className="rounded-lg">Oldest first</SelectItem>
          <SelectItem value="highest" className="rounded-lg">Highest amount</SelectItem>
          <SelectItem value="lowest" className="rounded-lg">Lowest amount</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  return (
    <div className="space-y-4 mb-6">
      <div className="hidden md:flex items-center gap-3 bg-muted/20 p-2 rounded-2xl border border-border/40">
        <FilterContent />
      </div>

      <div className="md:hidden">
        <Button 
          variant="outline" 
          onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
          className="w-full h-11 rounded-xl border-border/50 bg-background/50 justify-between font-bold"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="rounded-md bg-primary/20 text-primary px-2 py-0.5 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        
        <AnimatePresence>
          {isMobileFiltersOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-3 mt-3 p-4 rounded-2xl border border-border/50 bg-muted/10">
                <FilterContent />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {hasFilters && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between text-sm text-muted-foreground px-1"
          >
            <span>Showing {resultCount} result{resultCount !== 1 ? 's' : ''}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearFilters}
              className="h-8 rounded-lg text-xs hover:bg-muted/50 text-foreground/70"
            >
              <X className="mr-1 h-3 w-3" />
              Clear filters
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
