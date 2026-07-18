SELECT TOP (1000) [id]
      ,[email]
      ,[first_name]
      ,[surname]
      ,[DOB]
      ,[mobile_number]
      ,[subscriber_number]
      ,[department]
      ,[profession]
      ,[password_hash]
      ,[user_type]
      ,[Locked]
      ,[inputUser]
      ,[authoriser]
  FROM [zimpapersGPT].[dbo].[users]

UPDATE [zimpapersGPT].[dbo].[users] 
SET password_hash = 'scrypt:32768:8:1$9mZrhQxIVcHv1FIT$c51236807d3a79cf4dab6de99b5d1efccd572d3cc265485a726b4c624783e00bcc79bd5ae9b66e41c2802b871fe1e4c31a2d114d727f8d66c1fbf59f84aae1ce',
email = 'tvakisai@decisionedge.co.zw',
profession = 'Manager'
WHERE subscriber_number = 'EMP001';

UPDATE [zimpapersGPT].[dbo].[employees] 
SET email = 'tvakisai@decisionedge.co.zw'
WHERE employeeNumber = 'EMP001';

-- Verify the update
SELECT email, password_hash
FROM users 
WHERE email = 'tdzaramba@zb.co.zw';
