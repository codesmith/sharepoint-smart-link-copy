export type SiteType = 'onedrive-personal' | 'sharepoint-site';

export interface BreadcrumbSegment {
  label: string;
  url: string | null;
}

export interface PageContext {
  siteType: SiteType;
  origin: string;
  pathname: string;
  idParam: string;
  viewId?: string;
}

export interface BreadcrumbResult {
  segments: BreadcrumbSegment[];
  selectedItems: string[];
  html: string;
  text: string;
}
