-- PIVOT migration 03 (corrected): honor the sheet's own tags.
-- Salary -> Salary, Freelancer -> Salary (role Freelance), Partner Payout -> Payout.
-- Backfills person/role from the description; groups payouts into events by date.
-- Domain/Hosting + Project Fee stay Expense; Client Payment stays Income.

alter table money add column if not exists role text;
alter table money add column if not exists batch text;

-- 'Sent' means money already transferred -> Paid
update money set status='Paid' where status='Sent';

update money set dir='Salary', role='Freelance', partner='Issac' where id='LDG-0005';
update money set dir='Salary', role='Freelance', partner='Hadeer' where id='LDG-0006';
update money set dir='Salary', role='Freelance', partner='Issac' where id='LDG-0015';
update money set dir='Payout', cat='Partner Payout', batch='PO-20250119', partner='Daoud' where id='LDG-0016';
update money set dir='Payout', cat='Partner Payout', batch='PO-20250119', partner='Amr' where id='LDG-0017';
update money set dir='Payout', cat='Partner Payout', batch='PO-20250119', partner='Maisoun' where id='LDG-0018';
update money set dir='Payout', cat='Partner Payout', batch='PO-20250119', partner='Zawar' where id='LDG-0019';
update money set dir='Payout', cat='Partner Payout', batch='PO-20250119', partner='Bilal' where id='LDG-0020';
update money set dir='Salary', role='Freelance', partner='Issac' where id='LDG-0021';
update money set dir='Salary', role='Freelance' where id='LDG-0023';
update money set dir='Salary', role='Freelance', partner='Hadeer' where id='LDG-0025';
update money set dir='Salary', role='Freelance' where id='LDG-0027';
update money set dir='Salary', role='Freelance' where id='LDG-0032';
update money set dir='Salary', role='Freelance', partner='Hadeer' where id='LDG-0033';
update money set dir='Salary', role='Freelance', partner='Abdulla' where id='LDG-0038';
update money set dir='Salary', role='Freelance', partner='Duaa' where id='LDG-0039';
update money set dir='Payout', cat='Partner Payout', batch='PO-20250325', partner='Daoud' where id='LDG-0041';
update money set dir='Payout', cat='Partner Payout', batch='PO-20250325', partner='Amr' where id='LDG-0042';
update money set dir='Payout', cat='Partner Payout', batch='PO-20250325', partner='Maisoun' where id='LDG-0043';
update money set dir='Payout', cat='Partner Payout', batch='PO-20250325', partner='Zawar' where id='LDG-0044';
update money set dir='Payout', cat='Partner Payout', batch='PO-20250325', partner='Bilal' where id='LDG-0045';
update money set dir='Payout', cat='Partner Payout', batch='PO-20250621', partner='Bilal' where id='LDG-0050';
update money set dir='Salary', role='Freelance', partner='Abdulla' where id='LDG-0055';
update money set dir='Salary', role='Freelance', partner='Raneem' where id='LDG-0056';
update money set dir='Salary', role='Freelance', partner='Duaa' where id='LDG-0064';
update money set dir='Salary', role='Freelance', partner='Duaa' where id='LDG-0065';
update money set dir='Payout', cat='Partner Payout', batch='PO-20251110', partner='Daoud' where id='LDG-0066';
update money set dir='Payout', cat='Partner Payout', batch='PO-20251110', partner='Zawar' where id='LDG-0067';
update money set dir='Payout', cat='Partner Payout', batch='PO-20251110', partner='Maisoun' where id='LDG-0068';
update money set dir='Payout', cat='Partner Payout', batch='PO-20251111', partner='Daoud' where id='LDG-0069';
update money set dir='Payout', cat='Partner Payout', batch='PO-20251111', partner='Zawar' where id='LDG-0070';
update money set dir='Payout', cat='Partner Payout', batch='PO-20251215', partner='Daoud' where id='LDG-0078';
update money set dir='Payout', cat='Partner Payout', batch='PO-20251215', partner='Zawar' where id='LDG-0079';
update money set dir='Payout', cat='Partner Payout', batch='PO-20251215', partner='Maisoun' where id='LDG-0080';
update money set dir='Payout', cat='Partner Payout', batch='PO-20251231', partner='Daoud' where id='LDG-0082';
update money set dir='Payout', cat='Partner Payout', batch='PO-20251231', partner='Zawar' where id='LDG-0083';
update money set dir='Payout', cat='Partner Payout', batch='PO-20260131', partner='Daoud' where id='LDG-0089';
update money set dir='Payout', cat='Partner Payout', batch='PO-20260131', partner='Zawar' where id='LDG-0090';
update money set dir='Salary', role='Freelance', partner='Raneem' where id='LDG-0094';
update money set dir='Payout', cat='Partner Payout', batch='PO-20260201', partner='Daoud' where id='LDG-0095';
update money set dir='Payout', cat='Partner Payout', batch='PO-20260201', partner='Zawar' where id='LDG-0096';
update money set dir='Payout', cat='Partner Payout', batch='PO-20260201', partner='Arafa' where id='LDG-0097';
update money set dir='Payout', cat='Partner Payout', batch='PO-20260403', partner='Arafa' where id='LDG-0109';
update money set dir='Payout', cat='Partner Payout', batch='PO-20260403', partner='Daoud' where id='LDG-0110';
update money set dir='Payout', cat='Partner Payout', batch='PO-20260403', partner='Zawar' where id='LDG-0111';
update money set dir='Payout', cat='Partner Payout', batch='PO-20260414', partner='Daoud' where id='LDG-0112';
update money set dir='Payout', cat='Partner Payout', batch='PO-20260414', partner='Zawar' where id='LDG-0113';
update money set dir='Payout', cat='Partner Payout', batch='PO-20260423', partner='Arafa' where id='LDG-0114';
update money set dir='Payout', cat='Partner Payout', batch='PO-20260423', partner='Daoud' where id='LDG-0115';
update money set dir='Payout', cat='Partner Payout', batch='PO-20260423', partner='Zawar' where id='LDG-0116';
update money set dir='Payout', cat='Partner Payout', batch='PO-20260601', partner='Daoud' where id='LDG-0125';
update money set dir='Payout', cat='Partner Payout', batch='PO-20260701', partner='Zawar' where id='LDG-0126';
update money set dir='Payout', cat='Partner Payout', batch='PO-20260628', partner='Daoud' where id='LDG-0128';
update money set dir='Payout', cat='Partner Payout', batch='PO-20260628', partner='Zawar' where id='LDG-0129';
update money set dir='Salary', cat='Salary', partner='Daoud', role='Full-time' where id='LDG-0130';
update money set dir='Salary', cat='Salary', partner='Arafa', role='Part-time' where id='LDG-0131';
update money set dir='Salary', cat='Salary', partner='Zawar', role='Part-time' where id='LDG-0132';
update money set dir='Salary', cat='Salary', partner='Daoud', role='Full-time' where id='LDG-0136';
update money set dir='Salary', cat='Salary', partner='Arafa', role='Part-time' where id='LDG-0137';
update money set dir='Salary', cat='Salary', partner='Zawar', role='Part-time' where id='LDG-0138';
update money set dir='Salary', cat='Salary', partner='Daoud', role='Full-time' where id='LDG-0141';
update money set dir='Salary', cat='Salary', partner='Arafa', role='Part-time' where id='LDG-0142';
update money set dir='Salary', cat='Salary', partner='Zawar', role='Part-time' where id='LDG-0143';
update money set dir='Salary', cat='Salary', partner='Daoud', role='Full-time' where id='LDG-0146';
update money set dir='Salary', cat='Salary', partner='Arafa', role='Full-time' where id='LDG-0147';
update money set dir='Salary', cat='Salary', partner='Zawar', role='Part-time' where id='LDG-0148';
update money set dir='Salary', cat='Salary', partner='Daoud', role='Full-time' where id='LDG-0151';
update money set dir='Salary', cat='Salary', partner='Arafa', role='Full-time' where id='LDG-0152';
update money set dir='Salary', cat='Salary', partner='Zawar', role='Part-time' where id='LDG-0153';
