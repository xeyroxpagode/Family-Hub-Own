alter table public.finance_categories
  add column if not exists icon_key text null;

comment on column public.finance_categories.icon_key is
  'Optional curated HomePlus Finance icon key for custom category identity. Native categories continue to derive presentation from native_key.';

alter table public.finance_categories
  drop constraint if exists finance_categories_icon_key_check;

alter table public.finance_categories
  add constraint finance_categories_icon_key_check
  check (
    icon_key is null
    or icon_key in (
      'home-outline',
      'paw-outline',
      'car-outline',
      'restaurant-outline',
      'school-outline',
      'medkit-outline',
      'bag-outline',
      'ticket-outline',
      'hammer-outline',
      'gift-outline',
      'document-text-outline',
      'repeat-outline',
      'barbell-outline',
      'airplane-outline',
      'briefcase-outline',
      'storefront-outline',
      'card-outline',
      'receipt-outline',
      'cash-outline',
      'wallet-outline',
      'sparkles-outline',
      'book-outline',
      'phone-portrait-outline',
      'pricetag-outline'
    )
  );
