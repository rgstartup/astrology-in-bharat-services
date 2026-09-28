import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { QuotesService } from '../quotes.service';
import { CreateQuoteDto } from '../dto/create-quote.dto';
import { UpdateQuoteDto } from '../dto/update-quote.dto';

@ApiTags('Quotes')
@Controller({
  path: 'quotes',
  version: '1',
})
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new quote' })
  @ApiResponse({
    status: 201,
    description: 'The quote has been successfully created.',
  })
  create(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quotesService.create(createQuoteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all quotes' })
  @ApiResponse({ status: 200, description: 'Return all quotes.' })
  findAll() {
    return this.quotesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a quote by id' })
  @ApiResponse({ status: 200, description: 'Return the quote.' })
  @ApiResponse({ status: 404, description: 'Quote not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.quotesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a quote' })
  @ApiResponse({
    status: 200,
    description: 'The quote has been successfully updated.',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuoteDto: UpdateQuoteDto,
  ) {
    const _result = await this.quotesService.update(id, updateQuoteDto);
    return { success: true };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a quote' })
  @ApiResponse({
    status: 200,
    description: 'The quote has been successfully deleted.',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    const _result = await this.quotesService.remove(id);
    return { success: true };
  }
}
