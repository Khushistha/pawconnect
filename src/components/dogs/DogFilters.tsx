import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { DogSize, DogGender } from '@/types';

export interface DogFiltersState {
  search: string;
  size: DogSize | 'all';
  gender: DogGender | 'all';
  vaccinated: boolean;
  sterilized: boolean;
}

interface DogFiltersProps {
  filters: DogFiltersState;
  onFiltersChange: (filters: DogFiltersState) => void;
  onReset: () => void;
}

export function DogFilters({ filters, onFiltersChange, onReset }: DogFiltersProps) {
  const hasActiveFilters = 
    filters.search || 
    filters.size !== 'all' || 
    filters.gender !== 'all' || 
    filters.vaccinated || 
    filters.sterilized;

  return (
    <div className="bg-card rounded-xl border p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or breed..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-10"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Size Filter */}
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1.5 block">Size</Label>
          <Select
            value={filters.size}
            onValueChange={(value) => onFiltersChange({ ...filters, size: value as DogSize | 'all' })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All sizes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sizes</SelectItem>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Gender Filter */}
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1.5 block">Gender</Label>
          <Select
            value={filters.gender}
            onValueChange={(value) => onFiltersChange({ ...filters, gender: value as DogGender | 'all' })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All genders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All genders</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="vaccinated"
            checked={filters.vaccinated}
            onCheckedChange={(checked) => 
              onFiltersChange({ ...filters, vaccinated: checked as boolean })
            }
          />
          <Label htmlFor="vaccinated" className="text-sm cursor-pointer">
            Vaccinated
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="sterilized"
            checked={filters.sterilized}
            onCheckedChange={(checked) => 
              onFiltersChange({ ...filters, sterilized: checked as boolean })
            }
          />
          <Label htmlFor="sterilized" className="text-sm cursor-pointer">
            Sterilized
          </Label>
        </div>
      </div>

      {/* Reset Button */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-1">
          <X className="w-4 h-4" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
