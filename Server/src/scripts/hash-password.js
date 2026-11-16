import bcrypt from 'bcryptjs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const password = process.argv[2];

if (password) {
  bcrypt.hash(password, 10).then(hash => {
    console.log('\nGenerated bcrypt hash:');
    console.log(hash);
    process.exit(0);
  });
} else {
  rl.question('Enter password to hash: ', async (pwd) => {
    if (!pwd) {
      console.error('Password cannot be empty');
      process.exit(1);
    }
    const hash = await bcrypt.hash(pwd, 10);
    console.log('\nGenerated bcrypt hash:');
    console.log(hash);
    rl.close();
  });
}

