import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { ProductCategoryService } from "../product-category.service";
import { CreateCategoryDto, UpdateCategoryDto, GetCategoriesDto } from "../dto";
import { JwtAuthGuard } from "@/internal/auth/guards/auth.guard";
import { RolesGuard } from "@/internal/auth/guards/role.guard";
import { Roles } from "@/shared/decorators/roles.decorator";

@Controller({
  path: "product-categories",
  version: "1",
})
export class CategoryController {
  constructor(private readonly categoryService: ProductCategoryService) {}

  @Get()
  findAll(@Query() dto: GetCategoriesDto) {
    return this.categoryService.findAll(dto);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.categoryService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.categoryService.remove(id);
    return { success: true };
  }
}
