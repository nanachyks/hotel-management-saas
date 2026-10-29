-- Guarantees the subscription plan rows exist on every database, even fresh
-- production ones where seed.ts never runs. Registration looks up the
-- 'free_trial' slug to start each new hotel's trial — if these rows are
-- missing, signups silently start with no subscription at all.
--
-- Insert-only: never overwrites plans customized in the database.

INSERT INTO subscription_plans (id, name, slug, description, price_monthly, price_yearly, max_rooms, max_users, features, highlighted, sort_order)
SELECT '00000000-0000-0000-0000-000000000001', 'Free Trial', 'free_trial',
       'Get started with basic hotel management features. Perfect for testing the platform.',
       0, 0, 5, 2,
       '["Up to 5 rooms", "Up to 2 users", "Basic dashboard", "Manual bookings", "Email support"]',
       false, 1
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE slug = 'free_trial');

INSERT INTO subscription_plans (id, name, slug, description, price_monthly, price_yearly, max_rooms, max_users, features, highlighted, sort_order)
SELECT '00000000-0000-0000-0000-000000000002', 'Guesthouse', 'basic',
       'Essential tools for guesthouses and small hotels to manage daily operations.',
       250, 2500, 15, 5,
       '["Up to 15 rooms", "Up to 5 users", "Front desk & bookings", "Housekeeping tracker", "Own booking website", "WhatsApp support"]',
       false, 2
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE slug = 'basic');

INSERT INTO subscription_plans (id, name, slug, description, price_monthly, price_yearly, max_rooms, max_users, features, highlighted, sort_order)
SELECT '00000000-0000-0000-0000-000000000003', 'Hotel', 'professional',
       'Complete solution for hotels that want to grow — payments, payroll and reports included.',
       500, 5000, 50, 20,
       '["Up to 50 rooms", "Up to 20 users", "Everything in Guesthouse", "Mobile money & card payments", "Payroll & staff management", "Full reports & exports", "Priority WhatsApp support"]',
       true, 3
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE slug = 'professional');

INSERT INTO subscription_plans (id, name, slug, description, price_monthly, price_yearly, max_rooms, max_users, features, highlighted, sort_order)
SELECT '00000000-0000-0000-0000-000000000004', 'Group', 'enterprise',
       'Multiple properties under one account, with dedicated support.',
       1500, 15000, 9999, 9999,
       '["Multiple properties", "Everything in Hotel", "Multi-property dashboard", "Corporate & franchise clients", "White-label branding", "Dedicated account manager"]',
       false, 4
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE slug = 'enterprise');
