-- GBP is the app's billing denomination. Numeric demo amounts stay unchanged.
alter table public.invoices alter column currency set default 'GBP';

update public.invoices
set currency = 'GBP'
where upper(currency) = 'PKR';

-- Change only the currency literal in the current trusted booking function.
-- CREATE OR REPLACE keeps its existing owner, grants and authentication checks.
do $currency_update$
declare
  definition text;
begin
  definition := pg_get_functiondef(
    'private.book_appointment(uuid,timestamp with time zone,text,text,text)'::regprocedure
  );
  if strpos(definition, $literal$'PKR'$literal$) > 0 then
    execute replace(definition, $literal$'PKR'$literal$, $literal$'GBP'$literal$);
  elsif strpos(definition, $literal$'GBP'$literal$) = 0 then
    raise exception 'Booking invoice currency requires review';
  end if;
end
$currency_update$;
