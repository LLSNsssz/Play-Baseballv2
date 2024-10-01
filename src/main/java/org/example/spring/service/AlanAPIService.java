package org.example.spring.service;

import org.example.spring.repository.ExchangeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.OptionalDouble;
import java.util.List;
import java.util.ArrayList;

@Slf4j
@Service
public class AlanAPIService {
	private final String REGULAR_PRICE_PROMPT =
		"질문: 의 새 제품 출시 가격을 원 단위로 알려주세요. \n" +
			"답변 조건: \n" +
			"1. 가능한 한 정확한 숫자로 답변할 것 (예: 500000)\n" +
			"2. 가격 범위로 알고 있다면 '최소가격-최대가격' 형식으로 답변 (예: 500000-600000)\n" +
			"3. 천 단위 구분자(,)는 사용 가능\n" +
			"4. 단위(원)는 생략할 것\n" +
			"5. 정확한 가격을 모를 경우 평균적인 출시 가격이나 예상 가격을 답변\n" +
			"6. 가격 정보 외의 추가 설명은 절대로 생략할 것\n" +
			"7. 가격 정보를 전혀 찾을 수 없는 경우에만 '가격 정보 없음'이라고 답변할 것";

	@Value("${alan.host}")
	private String host;

	@Value("${alan.key}")
	private String client_id;

	private final RestTemplate restTemplate;
	private final ExchangeRepository exchangeRepository;

	public AlanAPIService(RestTemplate restTemplate, ExchangeRepository exchangeRepository) {
		this.restTemplate = restTemplate;
		this.exchangeRepository = exchangeRepository;
	}

	@Async
	@Transactional
	public void fetchRegularPriceAndUpdateExchange(String title, Long exchangeId) {
		log.debug("Fetching regular price for title: {} and exchangeId: {}", title, exchangeId);
		try {
			String fullPrompt = title + REGULAR_PRICE_PROMPT;
			log.debug("Full prompt: {}", fullPrompt);

			String response = getDataAsString(fullPrompt);
			log.debug("Raw response from Alan API: {}", response);

			String extractedContent = extractContentFromResponse(response);
			log.debug("Extracted content: {}", extractedContent);

			Optional<Integer> regularPrice = parsePrice(extractedContent);
			if (regularPrice.isPresent()) {
				log.debug("Parsed regular price: {}", regularPrice.get());
				exchangeRepository.updateRegularPrice(exchangeId, regularPrice.get());
				log.debug("Updated regular price for exchangeId: {} with price: {}", exchangeId, regularPrice.get());
			} else {
				log.debug("No valid price found for exchangeId: {}. Price not updated.", exchangeId);
				// 여기에 가격을 찾을 수 없을 때의 추가 로직을 구현할 수 있습니다.
				// 예: 기본값 설정, 사용자에게 알림 등
			}
		} catch (Exception e) {
			log.error("Error occurred while fetching regular price for exchangeId: " + exchangeId, e);
		}
	}

	public String getDataAsString(String content) {
		log.debug("Preparing to send request to Alan AI with content: {}", content);
		String url = UriComponentsBuilder.fromHttpUrl(host + "/api/v1/question")
			.queryParam("content", content)
			.queryParam("client_id", client_id)
			.toUriString();
		log.debug("Constructed URL for Alan API request: {}", url);

		ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
		log.debug("Received response from Alan API. Status code: {}", response.getStatusCode());
		log.debug("Response body: {}", response.getBody());

		return response.getBody();
	}

	private String extractContentFromResponse(String responseBody) {
		try {
			ObjectMapper objectMapper = new ObjectMapper();
			JsonNode rootNode = objectMapper.readTree(responseBody);
			JsonNode contentNode = rootNode.path("content");
			String content = contentNode.asText();
			log.debug("Extracted content from response: {}", content);
			return content;
		} catch (Exception e) {
			log.debug("Error parsing JSON response", e);
			throw new RuntimeException("JSON 파싱 중 오류가 발생했습니다.", e);
		}
	}

	private Optional<Integer> parsePrice(String content) {
		log.debug("Parsing price from content: {}", content);
		List<Integer> prices = new ArrayList<>();

		// 숫자만 추출하는 정규표현식 (천 단위 구분자 ','를 포함)
		Pattern pattern = Pattern.compile("\\d{1,3}(,\\d{3})*");
		Matcher matcher = pattern.matcher(content);

		while (matcher.find()) {
			String priceStr = matcher.group().replace(",", "");
			try {
				int price = Integer.parseInt(priceStr);
				if (price >= 1000) {  // 1000원 이상만 유효한 가격으로 간주
					prices.add(price);
				}
			} catch (NumberFormatException e) {
				log.debug("Failed to parse price: {}", priceStr);
			}
		}

		if (prices.isEmpty()) {
			log.debug("No valid prices found in the content");
			return Optional.empty();
		}

		// 가격이 하나만 있으면 그 가격을 반환
		if (prices.size() == 1) {
			return Optional.of(prices.get(0));
		}

		// 가격이 여러 개 있으면 평균값 계산
		OptionalDouble average = prices.stream().mapToInt(Integer::intValue).average();
		if (average.isPresent()) {
			int avgPrice = (int) Math.round(average.getAsDouble());
			log.debug("Calculated average price: {}", avgPrice);
			return Optional.of(avgPrice);
		}

		return Optional.empty();
	}
}