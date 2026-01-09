"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CHARACTER_CATEGORIES, GENDERS, AGE_RANGES } from "@/types/character";
import { formatNumber } from "@/lib/utils/formatters";
import { Plus, Search, Users, TrendingUp } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import { CharactersManager } from "@/components/admin/characters-manager";

export default function AdminCharactersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    gender: "",
    ageRange: "",
    isActive: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "characters", activeTab, filters, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("category", activeTab);
      if (filters.gender) params.set("gender", filters.gender);
      if (filters.ageRange) params.set("age_range", filters.ageRange);
      if (filters.isActive !== "") params.set("is_active", filters.isActive);
      if (searchQuery) params.set("search", searchQuery);

      const response = await fetch(
        `/api/admin/characters?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch characters");
      return response.json();
    },
  });

  const characters = data?.data || [];

  // Stats
  const stats = useMemo(() => {
    const active = characters.filter((c: any) => c.is_active).length;
    const mostUsed = [...characters]
      .sort((a: any, b: any) => (b.usage_count || 0) - (a.usage_count || 0))
      .slice(0, 5);

    return {
      total: characters.length,
      active,
      mostUsed,
    };
  }, [characters]);

  // Group by category
  const charactersByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {
      all: characters,
    };

    CHARACTER_CATEGORIES.forEach((category) => {
      grouped[category.id] = characters.filter(
        (c: any) => c.category === category.id
      );
    });

    return grouped;
  }, [characters]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Gestión de Personajes"
          subtitle="Administra todos los personajes disponibles"
        />
        <Button onClick={() => router.push("/admin/characters/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Añadir Personaje
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Total Personajes</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.total}
                </p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Activos</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.active}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Más Usados</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.mostUsed[0]?.usage_count || 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Input
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
              leftIcon={<Search className="h-4 w-4" />}
            />
            <select
              value={filters.gender}
              onChange={(e) =>
                setFilters({ ...filters, gender: e.target.value })
              }
              className="px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm"
            >
              <option value="">Todos los géneros</option>
              {GENDERS.map((gender) => (
                <option key={gender.id} value={gender.id}>
                  {gender.icon} {gender.label}
                </option>
              ))}
            </select>
            <select
              value={filters.ageRange}
              onChange={(e) =>
                setFilters({ ...filters, ageRange: e.target.value })
              }
              className="px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm"
            >
              <option value="">Todas las edades</option>
              {AGE_RANGES.map((range) => (
                <option key={range.id} value={range.id}>
                  {range.label}
                </option>
              ))}
            </select>
            <select
              value={filters.isActive}
              onChange={(e) =>
                setFilters({ ...filters, isActive: e.target.value })
              }
              className="px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs by Category */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">Todos</TabsTrigger>
          {CHARACTER_CATEGORIES.map((category) => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.name} ({charactersByCategory[category.id]?.length || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <CharactersManager
            characters={charactersByCategory.all}
            isLoading={isLoading}
          />
        </TabsContent>

        {CHARACTER_CATEGORIES.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-6">
            <CharactersManager
              characters={charactersByCategory[category.id] || []}
              isLoading={isLoading}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
