import { DataSource } from "typeorm";
import { PujaAppointment } from "../../src/modules/puja-appointment/infrastructure/entities/puja-appointment.entity";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../../src/app.module";

async function check() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);
    const repo = dataSource.getRepository(PujaAppointment);
    const appt = await repo.findOne({ where: { id: 6 as any }, relations: ['puja', 'expert'] });
    console.log("Appointment 6:", JSON.stringify(appt, null, 2));
    await app.close();
}

check().catch(console.error);
