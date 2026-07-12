import { useState, useMemo } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isToday,
  getDay,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  Undo2,
  Clock,
  User,
  DollarSign,
  Briefcase,
  AlertCircle,
  Pencil,
  Camera,
  MoreHorizontal,
  Palmtree,
  CircleDot,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NovoAgendamentoDialog } from "./NovoAgendamentoDialog";
import { FotosDialog } from "./FotosDialog";
import { type Agendamento, type Status, currency, isFolga } from "@/lib/agendamentos";

interface CalendarViewProps {
  items: Agendamento[];
  folgas: string[]; // Array of YYYY-MM-DD strings
  onToggleStatus: (id: string, status: Status) => void;
  onDeleteAgendamento: (id: string) => void;
  onRemoveFolga?: (date: string) => void;
}

type ViewMode = "mensal" | "semanal" | "quinzenal";

export function CalendarView({ items, folgas, onToggleStatus, onDeleteAgendamento, onRemoveFolga }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("mensal");
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // Filter out folga items from display items
  const displayItems = useMemo(() => items.filter((a) => !isFolga(a)), [items]);

  // Calculate start/end of current interval
  const { start, end } = useMemo(() => {
    let start: Date;
    let end: Date;

    if (viewMode === "mensal") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      start = startOfWeek(monthStart, { weekStartsOn: 0 });
      end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    } else if (viewMode === "semanal") {
      start = startOfWeek(currentDate, { weekStartsOn: 0 });
      end = endOfWeek(currentDate, { weekStartsOn: 0 });
    } else {
      // Quinzenal (2 weeks, starting at start of week of currentDate)
      start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const secondWeekEnd = addDays(start, 13);
      end = endOfWeek(secondWeekEnd, { weekStartsOn: 0 });
    }

    return { start, end };
  }, [currentDate, viewMode]);

  // Generate array of days for current interval
  const days = useMemo(() => {
    return eachDayOfInterval({ start, end });
  }, [start, end]);

  // Navigate periods
  const handlePrev = () => {
    setCurrentDate((prev) => {
      if (viewMode === "mensal") return subMonths(prev, 1);
      if (viewMode === "semanal") return subWeeks(prev, 1);
      return subDays(prev, 14); // 2 weeks back
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      if (viewMode === "mensal") return addMonths(prev, 1);
      if (viewMode === "semanal") return addWeeks(prev, 1);
      return addDays(prev, 14); // 2 weeks forward
    });
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Helper to format the period label
  const periodLabel = useMemo(() => {
    if (viewMode === "mensal") {
      const label = format(currentDate, "MMMM yyyy", { locale: ptBR });
      return label.charAt(0).toUpperCase() + label.slice(1);
    }

    const startLabel = format(start, "d 'de' MMM", { locale: ptBR });
    const endLabel = format(end, "d 'de' MMM 'de' yyyy", { locale: ptBR });
    return `${startLabel} a ${endLabel}`;
  }, [currentDate, viewMode, start, end]);

  // Group items by date for efficient lookup (excluding folgas)
  const agendamentosByDate = useMemo(() => {
    const map: Record<string, Agendamento[]> = {};
    displayItems.forEach((item) => {
      const dateStr = item.data_servico; // YYYY-MM-DD
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(item);
    });
    return map;
  }, [displayItems]);

  // Folgas set for O(1) lookup
  const folgasSet = useMemo(() => new Set(folgas), [folgas]);

  // Agendamentos of selected day
  const selectedDayItems = useMemo(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return agendamentosByDate[dateStr] ?? [];
  }, [selectedDate, agendamentosByDate]);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const isSelectedDayFolga = folgasSet.has(selectedDateStr);

  return (
    <div className="space-y-6">
      {/* Calendar Controls */}
      <Card className="shadow-card border border-border">
        <CardContent className="p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrev} className="h-9 w-9 cursor-pointer">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleToday} className="h-9 font-medium cursor-pointer">
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={handleNext} className="h-9 w-9 cursor-pointer">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="text-base sm:text-lg font-bold ml-2 truncate w-40 sm:w-auto">
              {periodLabel}
            </h2>
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg self-start sm:self-auto">
            <Button
              variant={viewMode === "mensal" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("mensal")}
              className={`h-8 font-medium cursor-pointer ${viewMode === "mensal" ? "shadow-sm bg-card" : ""}`}
            >
              Mensal
            </Button>
            <Button
              variant={viewMode === "quinzenal" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("quinzenal")}
              className={`h-8 font-medium cursor-pointer ${viewMode === "quinzenal" ? "shadow-sm bg-card" : ""}`}
            >
              Quinzenal
            </Button>
            <Button
              variant={viewMode === "semanal" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("semanal")}
              className={`h-8 font-medium cursor-pointer ${viewMode === "semanal" ? "shadow-sm bg-card" : ""}`}
            >
              Semanal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid view */}
      <Card className="shadow-card overflow-hidden border border-border">
        <CardContent className="p-0">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b bg-muted/30 text-center font-medium text-xs sm:text-sm text-muted-foreground py-2">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          {/* Days Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border bg-border/20">
            {days.map((day, idx) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayItems = agendamentosByDate[dateStr] ?? [];
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const currentDayIsToday = isToday(day);
              const dayOfWeek = getDay(day); // 0=Sun, 6=Sat
              const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
              const isDayFolga = folgasSet.has(dateStr);
              const hasAppointments = dayItems.length > 0;
              const isAvailable = isCurrentMonth && isWeekday && !hasAppointments && !isDayFolga;

              // Build cell classes
              let cellBg = "bg-card hover:bg-muted/10";
              let cellBorder = "";
              if (isDayFolga) {
                cellBg = "bg-slate-100/80 dark:bg-slate-800/40 hover:bg-slate-200/80 dark:hover:bg-slate-700/40";
              } else if (isAvailable) {
                cellBorder = "border-2 border-dashed !border-emerald-400/60";
              }
              if (!isCurrentMonth && viewMode === "mensal") {
                cellBg = "bg-muted/10 text-muted-foreground/50";
                cellBorder = "";
              }

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[90px] sm:min-h-[120px] p-1.5 sm:p-2.5 flex flex-col justify-between transition-colors cursor-pointer ${cellBg} ${cellBorder} ${
                    isSelected ? "ring-2 ring-primary ring-inset z-10" : ""
                  }`}
                >
                  {/* Day Indicator */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-semibold rounded-full flex h-6 w-6 items-center justify-center ${
                        currentDayIsToday
                          ? "bg-primary text-primary-foreground font-bold shadow-sm"
                          : isSelected
                          ? "text-primary"
                          : ""
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    {/* Status badges */}
                    {isDayFolga && isCurrentMonth && (
                      <Badge variant="secondary" className="text-[8px] sm:text-[9px] px-1 py-0 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold gap-0.5">
                        <Palmtree className="h-2.5 w-2.5" />
                        <span className="hidden sm:inline">Folga</span>
                      </Badge>
                    )}
                    {isAvailable && (
                      <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 py-0 border-emerald-400/60 text-emerald-600 dark:text-emerald-400 font-bold gap-0.5">
                        <CircleDot className="h-2.5 w-2.5" />
                        <span className="hidden sm:inline">Livre</span>
                      </Badge>
                    )}
                    {hasAppointments && !isDayFolga && (
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium hidden sm:inline">
                        {dayItems.length} {dayItems.length === 1 ? "serviço" : "serviços"}
                      </span>
                    )}
                  </div>

                  {/* Appointments list inside cell */}
                  <div className="mt-2 space-y-1 overflow-y-auto max-h-[50px] sm:max-h-[80px] custom-scrollbar">
                    {isDayFolga && isCurrentMonth && !hasAppointments && (
                      <div className="text-[9px] sm:text-[10px] p-1 rounded border flex items-center gap-1 truncate font-medium bg-slate-200/60 dark:bg-slate-700/60 border-slate-300/50 dark:border-slate-600 text-slate-500 dark:text-slate-400">
                        <Palmtree className="h-3 w-3 shrink-0" />
                        <span>Dia de Folga</span>
                      </div>
                    )}
                    {dayItems.map((a) => {
                      const isPago = a.status === "pago";
                      const colorClass = isPago
                        ? "bg-success/15 border-success/30 text-success"
                        : "bg-warning/15 border-warning/30 text-accent-foreground";

                      return (
                        <div
                          key={a.id}
                          className={`text-[9px] sm:text-[10px] p-1 rounded border flex items-center gap-1 truncate font-medium ${colorClass}`}
                          title={`${a.hora_inicio.slice(0, 5)} - ${a.cliente}`}
                        >
                          <span className="font-semibold shrink-0">{a.hora_inicio.slice(0, 5)}</span>
                          <span className="truncate">{a.cliente}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Details Panel */}
      <Card className="shadow-card border border-border">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())}
            </CardTitle>
            <CardDescription>
              {isSelectedDayFolga
                ? "Este dia está marcado como Folga."
                : selectedDayItems.length === 0
                ? "Nenhum agendamento marcado para esta data."
                : `${selectedDayItems.length} ${selectedDayItems.length === 1 ? "agendamento cadastrado" : "agendamentos cadastrados"}.`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isSelectedDayFolga && onRemoveFolga ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-slate-600 border-slate-300 hover:bg-slate-100 cursor-pointer"
                onClick={() => onRemoveFolga(selectedDateStr)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remover Folga
              </Button>
            ) : (
              <NovoAgendamentoDialog
                defaultDate={format(selectedDate, "yyyy-MM-dd")}
                trigger={
                  <Button size="sm" className="gradient-primary text-primary-foreground shadow-elevated cursor-pointer">
                    <Plus className="h-4 w-4" />
                    Agendar
                  </Button>
                }
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {isSelectedDayFolga && selectedDayItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Palmtree className="h-10 w-10 text-slate-400" />
              <p className="text-sm font-medium text-slate-500">Dia de folga — sem atendimentos.</p>
              <p className="text-xs text-slate-400">
                Clique em "Remover Folga" para liberar este dia.
              </p>
            </div>
          ) : selectedDayItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm">Clique em "Agendar" acima para adicionar um serviço neste dia.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {selectedDayItems.map((a) => {
                const isPago = a.status === "pago";
                return (
                  <Card key={a.id} className="shadow-sm border border-border bg-muted/10">
                    <CardContent className="p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      {/* Left: Info */}
                      <div className="space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-base truncate flex items-center gap-1.5">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            {a.cliente}
                          </h3>
                          <Badge
                            variant={isPago ? "default" : "outline"}
                            className={
                              isPago
                                ? "bg-success text-success-foreground hover:bg-success font-medium"
                                : "border-warning text-accent-foreground bg-warning/15 font-medium"
                            }
                          >
                            {isPago ? "Pago" : "Em Aberto"}
                          </Badge>
                        </div>

                        {/* Timing, Value, Services */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {a.hora_inicio.slice(0, 5)} - {a.hora_fim.slice(0, 5)}
                          </span>
                          <span className="flex items-center gap-0.5 font-medium text-foreground">
                            <DollarSign className="h-3.5 w-3.5" />
                            {currency(a.valor)}
                          </span>
                          {a.descricao && (
                            <span className="flex items-center gap-1 truncate max-w-xs">
                              <Briefcase className="h-3.5 w-3.5" />
                              {a.descricao}
                            </span>
                          )}
                        </div>

                        {/* Additional services badges */}
                        {a.servicos_adicionais && a.servicos_adicionais.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {a.servicos_adicionais.map((s, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[10px] px-2 py-0">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {/* Desktop buttons (visible from sm upwards) */}
                        <div className="hidden sm:flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onToggleStatus(a.id, isPago ? "em_aberto" : "pago")}
                            className={`gap-1.5 h-8 font-medium cursor-pointer ${
                              isPago ? "hover:text-amber-600 hover:bg-amber-50" : "hover:text-green-600 hover:bg-green-50"
                            }`}
                          >
                            {isPago ? (
                              <>
                                <Undo2 className="h-4 w-4" />
                                Reabrir
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4" />
                                Receber
                              </>
                            )}
                          </Button>

                          <NovoAgendamentoDialog
                            agendamento={a}
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 h-8 font-medium hover:text-primary hover:bg-primary/5 cursor-pointer"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Editar
                              </Button>
                            }
                          />

                          <FotosDialog
                            agendamento={a}
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 h-8 font-medium hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                              >
                                <Camera className="h-3.5 w-3.5 text-blue-500" />
                                Fotos
                              </Button>
                            }
                          />

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Deseja excluir o agendamento de ${a.cliente}?`)) {
                                onDeleteAgendamento(a.id);
                              }
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 cursor-pointer"
                            title="Excluir agendamento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Mobile dropdown buttons (visible on mobile only) */}
                        <div className="flex sm:hidden items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onToggleStatus(a.id, isPago ? "em_aberto" : "pago")}
                            className={`h-8 w-8 p-0 cursor-pointer ${
                              isPago ? "hover:text-amber-600 hover:bg-amber-50" : "hover:text-green-600 hover:bg-green-50"
                            }`}
                          >
                            {isPago ? (
                              <Undo2 className="h-4 w-4" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <NovoAgendamentoDialog
                                agendamento={a}
                                trigger={
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer gap-2">
                                    <Pencil className="h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                }
                              />
                              <FotosDialog
                                agendamento={a}
                                trigger={
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer gap-2">
                                    <Camera className="h-4 w-4 text-blue-500" />
                                    Fotos
                                  </DropdownMenuItem>
                                }
                              />
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(`Deseja excluir o agendamento de ${a.cliente}?`)) {
                                    onDeleteAgendamento(a.id);
                                  }
                                }}
                                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
