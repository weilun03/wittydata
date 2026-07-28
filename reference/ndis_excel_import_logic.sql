--1. Refer to: https://www.ndis.gov.au/providers/pricing-arrangements for the latest NDIS Pricing Arrangements and Price Limits Excel file.
--2. Quick Link to download NDIS Support Catalogue 2025-26 v.1.1 (XLSX 549KB) – effective 24 November 2025: https://www.ndis.gov.au/media/8038/download?attachment
--3. When processing the Excel file, make sure to process all Excel sheets in the Excel file 

-- A "Rate Set" must be created first to hold all of the imported Excel rows
CREATE TABLE IF NOT EXISTS rate_set (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  description text,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz,
  deleted_at timestamptz
);

-- Use the value of Excel "Column F" to populate "category_number"
-- Use the value of Excel "Column H" to populate "category_name"
-- There should be no duplicated "category_number" in the same "rate_set_id"
-- Convert "category_number" into integer and sort the data in ascending order, and use it to populate "sorting" which starts from 1 and is incremented by one for each "category_number" in the same "rate_set_id"
CREATE TABLE IF NOT EXISTS rate_set_category (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rate_set_id int NOT NULL REFERENCES rate_set(id),
  category_number text NOT NULL,
  category_name text NOT NULL,
  sorting int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz,
  deleted_at timestamptz
);

-- Use the values of Excel "Column F" and "Column H" as reference to populate "category_id", refer "rate_set_category.id"
-- Use the value of Excel "Column A" to populate "item_number"
-- Use the value of Excel "Column B" to populate "item_name"
-- use the value of Excel "Column I" to populdate "unit"
-- There should be no duplicated "category_number, item_number" combination in the same "rate_set_id"
-- "sorting" starts from 1 and is incremented by one for each "item_number" in the same "rate_set_id"
CREATE TABLE IF NOT EXISTS rate_set_support_item (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rate_set_id int NOT NULL REFERENCES rate_set(id),
  category_id int NOT NULL REFERENCES rate_set_category(id),
  item_number text NOT NULL,
  item_name text NOT NULL,
  unit text,
  sorting int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz,
  deleted_at timestamptz
);

-- Map Excel "Column J" and "Column W" to "Column AA" into a "rate_set_support_item_attribute_type" row as follow:
-- Map Excel "Column J" to populate: "code" = 'IS_QUOTE_REQUIRED', "label" = <use the header value of Excel "Column J", e.g., 'Quote'>
-- Map Excel "Column W" to populate: "code" = 'IS_NF2F_SUPPORT_PROVISION', "label" = <use the header value of Excel "Column W", e.g., 'Non-Face-to-Face Support Provision'>
-- Map Excel "Column X" to populate: "code" = 'IS_PROVIDER_TRAVEL', "label" = <use the header value of Excel "Column X", e.g., 'Provider Travel'>
-- Map Excel "Column Y" to populate: "code" = 'IS_SHORT_NOTICE_CANCEL', "label" = <use the header value of Excel "Column Y", e.g., 'Short Notice Cancellations.'>
-- Map Excel "Column Z" to populate: "code" = 'IS_NDIA_REQUESTED_REPORTS', "label" = <use the header value of Excel "Column Z", e.g., 'NDIA Requested Reports'>
-- Map Excel "Column AA" to populate: "code" = 'IS_IRREGULAR_SIL_SUPPORTS', "label" = <use the header value of Excel "Column AA", e.g., 'Irregular SIL Supports'>
CREATE TABLE IF NOT EXISTS rate_set_support_item_attribute_type (
  code text PRIMARY KEY,
  label text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz
);

-- Use the values of Excel "Column A" and "Column B" as reference to populate "support_item_id", refer "rate_set_support_item.id"
-- Use Excel "Column J" as reference to populate "attribute_code" (e.g., 'IS_QUOTE_REQUIRED'), use the value of Excel "Column J" to populate "value" (treat "Yes", "Y", case insensitive as "true", otherwise "false")
-- Use Excel "Column W" as reference to populate "attribute_code" (e.g., 'IS_NF2F_SUPPORT_PROVISION'), use the value of Excel "Column W" to populate "value" (treat "Yes", "Y", case insensitive as "true", otherwise "false")
-- Use Excel "Column X" as reference to populate "attribute_code" (e.g., 'IS_PROVIDER_TRAVEL'), use the value of Excel "Column X" to populate "value" (treat "Yes", "Y", case insensitive as "true", otherwise "false")
-- Use Excel "Column Y" as reference to populate "attribute_code" (e.g., 'IS_SHORT_NOTICE_CANCEL'), use the value of Excel "Column Y" to populate "value" (treat "Yes", "Y", case insensitive as "true", otherwise "false")
-- Use Excel "Column Z" as reference to populate "attribute_code" (e.g., 'IS_NDIA_REQUESTED_REPORTS'), use the value of Excel "Column Z" to populate "value" (treat "Yes", "Y", case insensitive as "true", otherwise "false")
-- Use Excel "Column AA" as reference to populate "attribute_code" (e.g., 'IS_IRREGULAR_SIL_SUPPORTS'), use the value of Excel "Column AA" to populate "value" (treat "Yes", "Y", case insensitive as "true", otherwise "false")
CREATE TABLE IF NOT EXISTS rate_set_support_item_attribute (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  support_item_id int NOT NULL REFERENCES rate_set_support_item(id),
  attribute_code text NOT NULL REFERENCES rate_set_support_item_attribute_type(code),
  value boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (support_item_id, attribute_code)
);

-- Map each unique value of Excel "Column AB" into "rate_set_support_item_type" row as follow:
-- To populate "code" as such: convert the value of Excel "Column AB" to uppercase and replace any number whitespaces into a single underscore. e.g., 'PRICE_LIMITED_SUPPORTS', 'QUOTABLE_SUPPORTS', 'UNIT_PRICE_=_$1'
-- To populate "label". e.g., 'Price Limited Supports', 'Quotable Supports', 'Unit Price = $1'
CREATE TABLE IF NOT EXISTS rate_set_support_item_type (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz
);

-- Map Excel "Column M" to "Column V" into a "rate_set_support_item_pricing_region" row as follow:
-- Map Excel "Column M" to populate: "code" = <convert the header value of Excel "Column M" to uppercase and replace any number whitespaces into a single underscore. e.g., ACT>, "label" = <use the header value of Excel "Column M". e.g., ACT>, "full_label" = 'Australian Capital Territory'
-- Map Excel "Column N" to populate: "code" = <convert the header value of Excel "Column N" to uppercase and replace any number whitespaces into a single underscore. e.g., NSW>, "label" = <use the header value of Excel "Column N". e.g., NSW>, "full_label" = 'New South Wales'
-- Map Excel "Column O" to populate: "code" = <convert the header value of Excel "Column O" to uppercase and replace any number whitespaces into a single underscore. e.g., NT>, "label" = <use the header value of Excel "Column O". e.g., NT>, "full_label" = 'Northern Territory'
-- Map Excel "Column P" to populate: "code" = <convert the header value of Excel "Column P" to uppercase and replace any number whitespaces into a single underscore. e.g., QLD>, "label" = <use the header value of Excel "Column P". e.g., QLD>, "full_label" = 'Queensland'
-- Map Excel "Column Q" to populate: "code" = <convert the header value of Excel "Column Q" to uppercase and replace any number whitespaces into a single underscore. e.g., SA>, "label" = <use the header value of Excel "Column Q". e.g., SA>, "full_label" = 'South Australia'
-- Map Excel "Column R" to populate: "code" = <convert the header value of Excel "Column R" to uppercase and replace any number whitespaces into a single underscore. e.g., TAS>, "label" = <use the header value of Excel "Column R". e.g., TAS>, "full_label" = 'Tasmania'
-- Map Excel "Column S" to populate: "code" = <convert the header value of Excel "Column S" to uppercase and replace any number whitespaces into a single underscore. e.g., VIC>, "label" = <use the header value of Excel "Column S". e.g., VIC>, "full_label" = 'Victoria'
-- Map Excel "Column T" to populate: "code" = <convert the header value of Excel "Column T" to uppercase and replace any number whitespaces into a single underscore. e.g., WA>, "label" = <use the header value of Excel "Column T". e.g., WA>, "full_label" = 'Western Australia'
-- Map Excel "Column U" to populate: "code" = <convert the header value of Excel "Column U" to uppercase and replace any number whitespaces into a single underscore. e.g., REMOTE>, "label" = <use the header value of Excel "Column U". e.g., Remote>, "full_label" = 'Remote'
-- Map Excel "Column V" to populate: "code" = <convert the header value of Excel "Column V" to uppercase and replace any number whitespaces into a single underscore. e.g., VERY_REMOTE>, "label" = <use the header value of Excel "Column V". e.g., Very Remote>, "full_label" = 'Very Remote'
CREATE TABLE IF NOT EXISTS rate_set_support_item_pricing_region (
  code text PRIMARY KEY,
  label text NOT NULL UNIQUE,
  full_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz
);

-- Map Excel "Column M" to "Column V" into a rate_set_support_item_price row as follow:
-- Use the values of Excel "Column A" and "Column B" as reference to populate "support_item_id", refer "rate_set_support_item.id"
-- Use the values of Excel "Column AB" as reference to populate "type_id", refer "rate_set_support_item_type.id"
-- Use the header values of Excel "Column M" to "Column V" as reference to populate "pricing_region_code", refer "rate_set_support_item_pricing_region.code"
-- Use the corresponding values of Excel "Column M" to "Column V" to populate "unit_price"
-- Use the value of Excel "Column K" to populate "start_date"
-- Use the value of Excel "Column L" to populate "end_date"
CREATE TABLE IF NOT EXISTS rate_set_support_item_price (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rate_set_id int NOT NULL REFERENCES rate_set(id),
  support_item_id int NOT NULL REFERENCES rate_set_support_item(id),
  type_id int REFERENCES rate_set_support_item_type(id),
  pricing_region_code text REFERENCES rate_set_support_item_pricing_region(code),
  unit_price numeric(24, 4),
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (
    rate_set_id,
    support_item_id,
    type_id,
    pricing_region_code,
    start_date,
    end_date
  )
);

-- There are only 3 genders by default: Female, Male, Unidentified
-- Derived the "code" from the "label", by converting "label" to uppercase, replace all whitespaces with a single underscore, and trim all whitespaces at both ends. e.g., FEMALE, MALE, UNIDENTIFIED
CREATE TABLE IF NOT EXISTS gender (
  id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz
);
