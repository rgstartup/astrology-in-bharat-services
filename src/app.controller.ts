import { Controller, Get } from "@nestjs/common";

@Controller({
  path: "/",
  version: "1",
})
export class AppController {
  @Get("ping")
  ping() {
    return "pong";
  }
}
