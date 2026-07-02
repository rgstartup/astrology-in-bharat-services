const fs = require('fs');
const files = [
  'src/modules/consultation/call/application/use-cases/get-expert-sessions.use-case.ts',
  'src/modules/consultation/call/application/use-cases/initiate-call.use-case.ts',
  'src/modules/consultation/chat/application/use-cases/find-expert-sessions.use-case.ts',
  'src/modules/consultation/chat/application/use-cases/initiate-chat.use-case.ts',
  'src/modules/consultation/chat/application/use-cases/activate-session.use-case.ts',
  'src/modules/consultation/reviews/application/use-cases/create-review.use-case.ts',
  'src/modules/consultation/consultation/application/use-cases/get-unified-history.use-case.ts',
  'src/modules/expert/todos/application/use-cases/create-todo.use-case.ts',
  'src/modules/expert/todos/application/use-cases/update-todo.use-case.ts',
  'src/modules/expert/todos/application/use-cases/remove-todo.use-case.ts',
  'src/modules/expert/todos/application/use-cases/find-all-todos.use-case.ts'
];
files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    if (!content.includes('forwardRef')) {
        content = content.replace(/import \{ Injectable(.*?)\} from '@nestjs\/common';/, 'import { Injectable, Inject, forwardRef$1} from \'@nestjs/common\';');
    }
    content = content.replace(/private (expertProfileFacade|clientProfileFacade|merchantProfileFacade|orderFacade): (ExpertProfileFacade|ClientProfileFacade|MerchantProfileFacade|OrderFacade)/g, '@Inject(forwardRef(() => $2)) private $1: $2');
    fs.writeFileSync(f, content);
  }
});
console.log('Done');
