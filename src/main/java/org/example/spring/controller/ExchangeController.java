package org.example.spring.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import org.example.spring.common.ApiResponseDto;
import org.example.spring.domain.exchange.dto.ExchangeAddRequestDto;
import org.example.spring.domain.exchange.dto.ExchangeModifyRequestDto;
import org.example.spring.domain.exchange.dto.ExchangeResponseDto;
import org.example.spring.exception.InvalidTokenException;
import org.example.spring.service.ExchangeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/exchanges")
public class ExchangeController {
  private final String PAGE_DEFAULT = "0";
  private final String PAGE_SIZE_DEFAULT = "16";
  private final ExchangeService exchangeService;

  @Autowired
  public ExchangeController(ExchangeService exchangeService) {
    this.exchangeService = exchangeService;
  }

  /**
   * 중고거래 게시물을 추가합니다.
   *
   * @param exchangeAddRequestDto 게시글 추가 요청 자료 DTO
   * @param images 게시글에 포함된 이미지
   * @return 생성된 게시물 응답 DTO
   */
  @PostMapping
  public ResponseEntity<ApiResponseDto<ExchangeResponseDto>> addExchange(
      @RequestPart("exchangeRequestDto") ExchangeAddRequestDto exchangeAddRequestDto,
      @RequestPart("images") List<MultipartFile> images) {
    ExchangeResponseDto response = exchangeService.addExchange(exchangeAddRequestDto, images);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponseDto.success(response.getTitle(), response));
  }

  /**
   * 기존에 작성되어 있던 중고거래 게시물 내용을 수정합니다.
   *
   * @param id DB에 등록된 수정할 게시글 id
   * @param request 게시글 수정 요청 자료 DTO
   * @return 수정된 게시물 응답 DTO
   */
  @PutMapping("/{id}")
  public ResponseEntity<ApiResponseDto<ExchangeResponseDto>> modifyExchange(
      @PathVariable Long id,
      @RequestPart("exchangeRequestDto") ExchangeModifyRequestDto exchangeModifyRequestDto,
      @RequestPart("images") List<MultipartFile> images,
      HttpServletRequest request,
      HttpServletResponse response) {

    try {
      ExchangeResponseDto exchangeResponseDto =
          exchangeService.modifyExchange(id, exchangeModifyRequestDto, images);
      return ResponseEntity.status(HttpStatus.OK)
          .body(ApiResponseDto.success(exchangeResponseDto.getTitle(), exchangeResponseDto));
    } catch (InvalidTokenException e) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
          .body(ApiResponseDto.success(e.getMessage(), null));
    }
  }

  /**
   * 기존에 작성되어 있던 중고거래 게시물을 삭제합니다. 삭제는 Soft delete 방식으로 이루어지며, DB에 등록된 deleted_at 내용에 값을 추가합니다.
   *
   * @param id DB에 등록된 삭제할 게시글 id
   * @return 삭제된 게시물 응답 DTO
   */
  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponseDto<Void>> deleteExchange(@PathVariable Long id) {
    exchangeService.deleteExchange(id);
    return ResponseEntity.status(HttpStatus.OK)
        .body(ApiResponseDto.success("게시물이 삭제 되었습니다.", null));
  }

  /**
   * 작성되어 있는 모든 게시물을 조회합니다.
   *
   * @return 작성되어 있는 모든 게시물
   */
  @GetMapping
  public ResponseEntity<ApiResponseDto<Page<ExchangeResponseDto>>> getAllExchanges(
      @RequestParam(required = false, defaultValue = PAGE_DEFAULT) int page,
      @RequestParam(required = false, defaultValue = PAGE_SIZE_DEFAULT) int size) {
    Page<ExchangeResponseDto> responses = exchangeService.getAllExchanges(page, size);
    return ResponseEntity.status(HttpStatus.OK)
        .body(ApiResponseDto.success("모든 게시물 조회 성공.", responses));
  }

  /**
   * 최근에 작성된 게시물 5개를 조회합니다.
   *
   * @return Exchange table 에서 Created_at을 내림차순으로 정렬한 row 5개
   */
  @GetMapping("/five")
  public ResponseEntity<ApiResponseDto<List<ExchangeResponseDto>>> getLatestFiveExchanges() {
    List<ExchangeResponseDto> responses = exchangeService.getLatestFiveExchanges();
    return ResponseEntity.status(HttpStatus.OK)
        .body(ApiResponseDto.success("게시물 5개 조회 성공.", responses));
  }

  /**
   * 특정 회원이 작성한 게시물을 조회합니다.
   *
   * @param memberId 특정 회원 id
   * @return memberId와 일치하는 게시글 목록
   */
  @GetMapping("/{memberId}")
  public ResponseEntity<ApiResponseDto<Page<ExchangeResponseDto>>> getMyExchanges(
      @PathVariable Long memberId,
      @RequestParam(required = false, defaultValue = PAGE_DEFAULT) int page,
      @RequestParam(required = false, defaultValue = PAGE_SIZE_DEFAULT) int size) {
    Page<ExchangeResponseDto> responses = exchangeService.getUserExchanges(memberId, page, size);
    return ResponseEntity.status(HttpStatus.OK)
        .body(ApiResponseDto.success("회원의 게시물 조회 성공", responses));
  }
}
