"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  Updater,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Search } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount: number;
  onPageChange: (pageIndex: number) => void;
  onSortChange: (updater: Updater<SortingState>) => void;
  onFilterChange: (filter: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  children?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  onPageChange,
  onSortChange,
  onFilterChange,
  onRefresh,
  isLoading,
  pageIndex,
  pageSize,
  sorting,
  children,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount,
    onSortingChange: onSortChange,
    state: {
      sorting,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
  });

  return (
    <div className="space-y-4">
      <div className="glass flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl p-4 border border-border/50 shadow-sm relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -z-10" />

        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search data..."
              onChange={(event) => onFilterChange(event.target.value)}
              className="pl-9 rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary/20 h-10 w-full"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            className="rounded-xl border-border/50 hover:bg-muted/80 bg-background/50 h-10 w-10 shrink-0 shadow-sm"
          >
            <span className="sr-only">Refresh</span>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <RefreshCw className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {children}
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30 hover:bg-muted/30">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-border/50 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-12 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading Skeleton State
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index} className="border-border/40">
                  {columns.map((_, cellIndex) => (
                    <TableCell key={cellIndex} className="py-4">
                      <div className="h-5 w-full max-w-[80%] bg-muted rounded-md animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-border/40 hover:bg-muted/30 transition-colors duration-200 group"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3.5 text-sm group-hover:text-foreground text-muted-foreground transition-colors">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Search className="h-8 w-8 mb-3 opacity-20" />
                    <p>No results found.</p>
                    <p className="text-xs opacity-70 mt-1">Try adjusting your filters or creating a new entry.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center justify-between px-2 py-1">
        <p className="text-sm text-muted-foreground hidden sm:block">
          Showing page <span className="font-medium text-foreground">{pageIndex + 1}</span> of{" "}
          <span className="font-medium text-foreground">{pageCount > 0 ? pageCount : 1}</span>
        </p>
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={pageIndex === 0}
            className="rounded-xl border-border/50 hover:bg-muted shadow-sm h-9 px-4"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground sm:hidden">
            {pageIndex + 1} / {pageCount > 0 ? pageCount : 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={pageIndex + 1 >= pageCount}
            className="rounded-xl border-border/50 hover:bg-muted shadow-sm h-9 px-4"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}