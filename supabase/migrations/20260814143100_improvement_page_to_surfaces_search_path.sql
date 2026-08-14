-- improvement_page_to_surfaces の search_path を固定する。
alter function public.improvement_page_to_surfaces(text) set search_path = public;
