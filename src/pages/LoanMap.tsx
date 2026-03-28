import { useEffect, useRef, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoans, type LoanFilters, defaultFilters, applyFilters } from '@/hooks/useLoans';
import { useBranches } from '@/hooks/useBranches';
import { Loan, Branch } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import LoanDetailDrawer from '@/components/loans/LoanDetailDrawer';

const CLASS_COLORS: Record<string, string> = {
  STD: '#22c55e', SMA: '#3b82f6', SS: '#f97316', DF: '#a855f7', BL: '#ef4444',
};

const createIcon = (color: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 40" width="24" height="40">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 28 12 28s12-19 12-28C24 5.4 18.6 0 12 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="#fff"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [24, 40],
    iconAnchor: [12, 40],
    popupAnchor: [0, -40],
  });
};

const LoanMap = () => {
  const { profile, userRole } = useAuth();
  const branchFilter = userRole === 'manager' ? profile?.branch_id : undefined;
  const { data: loans, isLoading } = useLoans(branchFilter);
  const { data: branches } = useBranches();

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [radius, setRadius] = useState<number>(5);
  const [detailLoan, setDetailLoan] = useState<Loan | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters] = useState<LoanFilters>(defaultFilters);

  const filteredLoans = useMemo(() => {
    if (!loans) return [];
    return applyFilters(loans, filters, '');
  }, [loans, filters]);

  const currentBranch = useMemo(() => {
    if (!selectedBranch || !branches) return null;
    return branches.find(b => b.id === selectedBranch) || null;
  }, [selectedBranch, branches]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current).setView([23.8103, 90.4125], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    markersLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Auto-select first branch
  useEffect(() => {
    if (branches?.length && !selectedBranch) {
      const defaultBranch = profile?.branch_id || branches[0]?.id;
      if (defaultBranch) setSelectedBranch(defaultBranch);
    }
  }, [branches, profile?.branch_id, selectedBranch]);

  // Update map center and circle on branch/radius change
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !currentBranch) return;
    const lat = currentBranch.latitude || 23.8103;
    const lng = currentBranch.longitude || 90.4125;
    map.setView([lat, lng], 12);

    if (circleRef.current) { circleRef.current.remove(); }
    circleRef.current = L.circle([lat, lng], {
      radius: radius * 1000,
      color: 'hsl(215, 70%, 22%)',
      fillColor: 'hsl(215, 70%, 22%)',
      fillOpacity: 0.08,
      weight: 2,
      dashArray: '6 4',
    }).addTo(map);
  }, [currentBranch, radius]);

  // Update markers on loan data change
  useEffect(() => {
    if (!markersLayer.current) return;
    markersLayer.current.clearLayers();

    filteredLoans.forEach(loan => {
      if (!loan.latitude || !loan.longitude) return;
      const cls = loan.classification || 'STD';
      const color = CLASS_COLORS[cls] || '#6b7280';
      const icon = createIcon(color);

      const tooltipContent = `
        <div style="font-size:12px;line-height:1.5;min-width:180px">
          <strong>${loan.account_no || ''}</strong><br/>
          ${loan.account_name || ''}<br/>
          <b>Borrower:</b> ${loan.borrower_name}<br/>
          <b>Installment:</b> ৳${(loan.installment_amount || 0).toLocaleString()}<br/>
          <b>Overdue Inst.:</b> ${loan.overdue_installment_number}<br/>
          <b>Overdue Amt:</b> ৳${(loan.overdue_amount || 0).toLocaleString()}<br/>
          <b>Outstanding:</b> ৳${(loan.outstanding_amount || 0).toLocaleString()}<br/>
          <b>Class:</b> <span style="color:${color};font-weight:bold">${cls}</span>
        </div>`;

      const marker = L.marker([loan.latitude, loan.longitude], { icon })
        .bindTooltip(tooltipContent, { direction: 'top', sticky: true })
        .on('click', () => {
          setDetailLoan(loan);
          setDrawerOpen(true);
        });

      markersLayer.current!.addLayer(marker);
    });
  }, [filteredLoans]);

  const loansWithCoords = filteredLoans.filter(l => l.latitude && l.longitude).length;

  return (
    <div className="container py-6 space-y-4">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Loan Map View</h1>

      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="space-y-1.5 w-full sm:w-64">
          <Label className="text-xs">Branch</Label>
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select branch" /></SelectTrigger>
            <SelectContent>
              {branches?.map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 w-full sm:w-40">
          <Label className="text-xs">Radius (km)</Label>
          <Input type="number" min={1} max={100} value={radius} onChange={e => setRadius(Number(e.target.value) || 5)} className="h-9" />
        </div>
        <div className="flex gap-2 items-center">
          {Object.entries(CLASS_COLORS).map(([cls, color]) => (
            <Badge key={cls} variant="outline" className="gap-1 text-xs">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
              {cls}
            </Badge>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0 relative">
          {isLoading && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/60">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <div ref={mapRef} className="h-[500px] sm:h-[600px] w-full" />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Showing {loansWithCoords} of {filteredLoans.length} loans with coordinates
      </p>

      <LoanDetailDrawer
        loan={detailLoan}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDetailLoan(null); }}
        onEdit={() => {}}
        onDelete={() => {}}
        userRole={userRole}
        branches={branches || []}
      />
    </div>
  );
};

export default LoanMap;
