export interface PageViewItem {
  path: string;
  title: string;
  views: number;
  percentage: number;
}

export interface TrafficSourceItem {
  source: string;
  percentage: number;
  count: number;
}

export interface DeviceBreakdownData {
  mobile: number;
  desktop: number;
  tablet: number;
  mobilePct: number;
  desktopPct: number;
  tabletPct: number;
}

export interface DailyRecordDto {
  date: string;
  formattedDate: string;
  pageViews: number;
  uniqueVisitors: number;
}

export interface AnalyticsSummary {
  totalVisitors: string;
  uniqueVisitors: string;
  pageViews: string;
  bounceRate: string;
  avgSessionDuration: string;
}

export interface AnalyticsResponse {
  period: string;
  days: number;
  summary: AnalyticsSummary;
  dailyRecords: DailyRecordDto[];
  topPages: PageViewItem[];
  trafficSources: TrafficSourceItem[];
  deviceBreakdown: DeviceBreakdownData;
}
