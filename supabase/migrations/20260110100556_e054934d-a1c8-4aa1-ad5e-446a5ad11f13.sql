-- Enable RLS on billing_plans (public read access)
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can view billing plans
CREATE POLICY "Anyone can view billing plans"
ON public.billing_plans FOR SELECT
USING (true);

-- Only admins can manage billing plans
CREATE POLICY "Admins can manage billing plans"
ON public.billing_plans FOR ALL
USING (public.has_role(auth.uid(), 'admin'));