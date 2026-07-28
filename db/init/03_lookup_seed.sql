-- gender and pricing_region are fixed, externally-defined enums (not derived
-- from business data), so they're bootstrapped here rather than left to be
-- populated only as a side effect of the first NDIS Excel import.

insert into gender (code, label)
values
    ('FEMALE', 'Female'),
    ('MALE', 'Male'),
    ('UNIDENTIFIED', 'Unidentified')
on conflict (code) do nothing;

insert into rate_set_support_item_pricing_region (code, label, full_label)
values
    ('ACT', 'ACT', 'Australian Capital Territory'),
    ('NSW', 'NSW', 'New South Wales'),
    ('NT', 'NT', 'Northern Territory'),
    ('QLD', 'QLD', 'Queensland'),
    ('SA', 'SA', 'South Australia'),
    ('TAS', 'TAS', 'Tasmania'),
    ('VIC', 'VIC', 'Victoria'),
    ('WA', 'WA', 'Western Australia'),
    ('REMOTE', 'Remote', 'Remote'),
    ('VERY_REMOTE', 'Very Remote', 'Very Remote')
on conflict (code) do nothing;
