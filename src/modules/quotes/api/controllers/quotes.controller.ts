import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { QuotesFacade } from '../../application/quotes.facade';
import { CreateQuoteDto } from '../dto/create-quote.dto';
import { UpdateQuoteDto } from '../dto/update-quote.dto';   

@ApiTags('Quotes')
@Controller({
  path: 'quotes',
  version: '1',
})
export class QuotesController {
  constructor(private readonly quotesFacade: QuotesFacade) {}

  @Post()
  @ApiOperation({ summary: 'Create a new quote' })
  @ApiResponse({ status: 201, description: 'The quote has been successfully created.' })
  create(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quotesFacade.create(createQuoteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all quotes' })
  @ApiResponse({ status: 200, description: 'Return all quotes.' })
  findAll() {
    return this.quotesFacade.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a quote by id' })
  @ApiResponse({ status: 200, description: 'Return the quote.' })
  @ApiResponse({ status: 404, description: 'Quote not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotesFacade.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a quote' })
  @ApiResponse({ status: 200, description: 'The quote has been successfully updated.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateQuoteDto: UpdateQuoteDto,
  ) {
    return this.quotesFacade.update(id, updateQuoteDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a quote' })
  @ApiResponse({ status: 200, description: 'The quote has been successfully deleted.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotesFacade.remove(id);
  }
}
