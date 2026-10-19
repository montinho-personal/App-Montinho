-- Remove o aluno FICTÍCIO criado por scripts/seed-aluno-teste.sql e tudo o
-- que pertence a ele (sessões, séries, medidas, check-ins, versões...).
-- Afeta somente o usuário lucas.teste@example.com.
delete from auth.users where id = 'a0000000-0000-4000-8000-000000000001' and email = 'lucas.teste@example.com';
