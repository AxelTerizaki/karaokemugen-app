-- Up 

INSERT INTO user(login,password,nickname,NORM_nickname,flag_admin,last_login) VALUES ('admin','5e8742c987dbc38d0d0b5139926c64cd5c552989f71cc8e73652b36f161ff942','Administrator','Administrator',0,0);

-- Down

DELETE FROM user WHERE login = 'admin';