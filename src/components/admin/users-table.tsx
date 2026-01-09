"use client";

import { useState, useMemo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  CreditCard,
  Ban,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";
import type { Profile, Plan } from "@/types/database";

interface UsersTableProps {
  users: Array<
    Profile & {
      plans?: Plan | null;
      movies_count?: number;
    }
  >;
  isLoading?: boolean;
  onUserClick?: (userId: string) => void;
  onChangePlan?: (userId: string) => void;
  onSuspend?: (userId: string) => void;
  onDelete?: (userId: string) => void;
  onBulkSuspend?: (userIds: string[]) => void;
}

type SortField = "full_name" | "email" | "created_at" | "movies_count";
type SortDirection = "asc" | "desc";

export function UsersTable({
  users,
  isLoading = false,
  onUserClick,
  onChangePlan,
  onSuspend,
  onDelete,
  onBulkSuspend,
}: UsersTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filters, setFilters] = useState({
    plan: "",
    status: "",
    role: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Filter and sort
  const filteredAndSorted = useMemo(() => {
    let filtered = [...users];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    // Filters
    if (filters.plan) {
      filtered = filtered.filter((user) => user.plan_id === filters.plan);
    }
    if (filters.status) {
      filtered = filtered.filter(
        (user) => (user.is_active ? "active" : "inactive") === filters.status
      );
    }
    if (filters.role) {
      filtered = filtered.filter((user) => user.role === filters.role);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "full_name":
          aValue = a.full_name || a.email;
          bValue = b.full_name || b.email;
          break;
        case "email":
          aValue = a.email;
          bValue = b.email;
          break;
        case "created_at":
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case "movies_count":
          aValue = a.movies_count || 0;
          bValue = b.movies_count || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchQuery, filters, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSorted.length / pageSize);
  const paginatedUsers = filteredAndSorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map((u) => u.id)));
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-foreground-muted">
        Cargando usuarios...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Input
          placeholder="Buscar por nombre o email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={filters.plan}
          onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
          className="px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm"
        >
          <option value="">Todos los planes</option>
          {/* TODO: Load plans */}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
        <select
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          className="px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm"
        >
          <option value="">Todos los roles</option>
          <option value="user">Usuario</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
          <span className="text-sm text-foreground">
            {selectedUsers.size} usuario(s) seleccionado(s)
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (onBulkSuspend) {
                onBulkSuspend(Array.from(selectedUsers));
              }
              setSelectedUsers(new Set());
            }}
          >
            Suspender Seleccionados
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-secondary">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={
                      paginatedUsers.length > 0 &&
                      selectedUsers.size === paginatedUsers.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground-muted">
                  Usuario
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-foreground-muted cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("email")}
                >
                  <div className="flex items-center gap-2">
                    Email
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground-muted">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground-muted">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground-muted">
                  Rol
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-foreground-muted cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("movies_count")}
                >
                  <div className="flex items-center gap-2">
                    Películas
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-foreground-muted cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("created_at")}
                >
                  <div className="flex items-center gap-2">
                    Fecha Registro
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-foreground-muted">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-foreground-muted">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-card-hover transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={() => toggleSelectUser(user.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback name={user.full_name || user.email} />
                        </Avatar>
                        <span className="font-medium text-foreground">
                          {user.full_name || "Sin nombre"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-muted">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">
                        {user.plans?.name || "Sin plan"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={user.is_active ? "success" : "error"}
                      >
                        {user.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          user.role === "superadmin"
                            ? "default"
                            : user.role === "admin"
                            ? "info"
                            : "secondary"
                        }
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {user.movies_count || 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-muted">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onUserClick && (
                            <DropdownMenuItem onClick={() => onUserClick(user.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalle
                            </DropdownMenuItem>
                          )}
                          {onChangePlan && (
                            <DropdownMenuItem
                              onClick={() => onChangePlan(user.id)}
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Cambiar Plan
                            </DropdownMenuItem>
                          )}
                          {onSuspend && (
                            <DropdownMenuItem
                              onClick={() => onSuspend(user.id)}
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              {user.is_active ? "Suspender" : "Activar"}
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem
                              onClick={() => onDelete(user.id)}
                              className="text-error"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-foreground-muted">
            Mostrando {(currentPage - 1) * pageSize + 1} -{" "}
            {Math.min(currentPage * pageSize, filteredAndSorted.length)} de{" "}
            {filteredAndSorted.length}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
